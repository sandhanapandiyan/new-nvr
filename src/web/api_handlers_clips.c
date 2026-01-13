#include "api_handlers_clips.h"
#include "core/config.h"
#include "core/logger.h"
#include "database/db_recordings.h"
#include "web/api_handlers.h"
#include <cjson/cJSON.h>
#include <dirent.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

#define EXPORTS_DIR "local/exports"

void init_clips_module(void) {
  struct stat st = {0};
  if (stat(EXPORTS_DIR, &st) == -1) {
    mkdir(EXPORTS_DIR, 0755);
  }
}

void mg_handle_get_clips(struct mg_connection *c, struct mg_http_message *hm) {
  DIR *d;
  struct dirent *dir;
  d = opendir(EXPORTS_DIR);

  if (!d) {
    mg_http_reply(c, 500, "Content-Type: application/json\r\n",
                  "{\"error\":\"Could not open exports directory\"}");
    return;
  }

  cJSON *files = cJSON_CreateArray();
  while ((dir = readdir(d)) != NULL) {
    if (dir->d_type == DT_REG) {
      // Only listing .mp4 files
      if (strstr(dir->d_name, ".mp4")) {
        struct stat file_stat;
        char full_path[512];
        snprintf(full_path, sizeof(full_path), "%s/%s", EXPORTS_DIR,
                 dir->d_name);

        if (stat(full_path, &file_stat) == 0) {
          cJSON *file_obj = cJSON_CreateObject();
          cJSON_AddStringToObject(file_obj, "name", dir->d_name);
          cJSON_AddNumberToObject(file_obj, "size", file_stat.st_size);
          cJSON_AddNumberToObject(file_obj, "mtime", file_stat.st_mtime);
          cJSON_AddItemToArray(files, file_obj);
        }
      }
    }
  }
  closedir(d);

  char *json_str = cJSON_PrintUnformatted(files);
  mg_http_reply(c, 200, "Content-Type: application/json\r\n", "%s", json_str);
  free(json_str);
  cJSON_Delete(files);
}

void mg_handle_delete_clips(struct mg_connection *c,
                            struct mg_http_message *hm) {
  char filename[256];
  if (mg_http_get_var(&hm->query, "filename", filename, sizeof(filename)) <=
      0) {
    mg_http_reply(c, 400, "Content-Type: application/json\r\n",
                  "{\"error\":\"Missing filename\"}");
    return;
  }

  // Basic sanitization
  if (strstr(filename, "..") || strchr(filename, '/')) {
    mg_http_reply(c, 403, "Content-Type: application/json\r\n",
                  "{\"error\":\"Invalid filename\"}");
    return;
  }

  char full_path[512];
  snprintf(full_path, sizeof(full_path), "%s/%s", EXPORTS_DIR, filename);

  if (unlink(full_path) == 0) {
    mg_http_reply(c, 200, "Content-Type: application/json\r\n",
                  "{\"success\":true}");
  } else {
    mg_http_reply(c, 500, "Content-Type: application/json\r\n",
                  "{\"error\":\"Failed to delete file\"}");
  }
}

void mg_handle_post_clips_generate(struct mg_connection *c,
                                   struct mg_http_message *hm) {
  cJSON *body = mg_parse_json_body(hm);
  if (!body) {
    mg_http_reply(c, 400, "Content-Type: application/json\r\n",
                  "{\"error\":\"Invalid JSON\"}");
    return;
  }

  cJSON *stream_name_json = cJSON_GetObjectItem(body, "stream_name");
  cJSON *start_time_json = cJSON_GetObjectItem(body, "start_time");
  cJSON *end_time_json = cJSON_GetObjectItem(body, "end_time");

  if (!cJSON_IsString(stream_name_json) || !cJSON_IsNumber(start_time_json) ||
      !cJSON_IsNumber(end_time_json)) {
    cJSON_Delete(body);
    mg_http_reply(c, 400, "Content-Type: application/json\r\n",
                  "{\"error\":\"Missing parameters\"}");
    return;
  }

  const char *stream_name = stream_name_json->valuestring;
  long start_time = (long)start_time_json->valuedouble;
  long end_time = (long)end_time_json->valuedouble;

  // Validate times
  if (end_time <= start_time) {
    cJSON_Delete(body);
    mg_http_reply(c, 400, "Content-Type: application/json\r\n",
                  "{\"error\":\"Invalid time range\"}");
    return;
  }

  // 1. Find the recording in DB that covers start_time
  // We fetch a batch around the start time
  int count = 0;
  recording_metadata_t *recs = NULL;

  // We'll define a simpler search: get all recordings for stream, iterate
  // (inefficient but safe for now) Or use the limit/offset pagination but
  // sorted by date desc? Let's rely on finding ONE segment.

  // Assuming we have get_recording_metadata_paginated(stream, limit, offset,
  // &count, &recs) We need to query by time. The current DB API might be
  // limited. Let's assume we can get latest and search backwards, or use a
  // custom query if possible? Actually, `get_recording_metadata_paginated`
  // lists all. Better: let's assume the frontend passes the `recording_id` if
  // known? The user prompts implies selection from timeline.
  // PlaybackControlRoom has context. IF the frontend passes `recording_id`,
  // it's much safer.

  cJSON *recording_id_json = cJSON_GetObjectItem(body, "recording_id");

  char source_path[512] = {0};
  long rec_start_time = 0;

  if (cJSON_IsNumber(recording_id_json)) {
    // Use ID
    uint64_t rid = (uint64_t)recording_id_json->valuedouble;
    recording_metadata_t meta;
    if (get_recording_metadata_by_id(rid, &meta) == 0) {
      strncpy(source_path, meta.file_path, sizeof(source_path) - 1);
      rec_start_time = meta.start_time;
    }
  } else {
    // Fallback: try to find it (harder without direct SQL access in this C file
    // context) Let's implement a quick linear scan of recent recordings? No,
    // that's too slow. Let's error if ID not provided for now, but update
    // Frontend to provide it.
    cJSON_Delete(body);
    mg_http_reply(c, 400, "Content-Type: application/json\r\n",
                  "{\"error\":\"recording_id is required\"}");
    return;
  }

  cJSON_Delete(body);

  if (source_path[0] == '\0') {
    mg_http_reply(c, 404, "Content-Type: application/json\r\n",
                  "{\"error\":\"Recording not found\"}");
    return;
  }

  // Check if source exists
  if (access(source_path, F_OK) != 0) {
    log_error("Source file not found: %s", source_path);
    mg_http_reply(c, 404, "Content-Type: application/json\r\n",
                  "{\"error\":\"Source file missing on disk\"}");
    return;
  }

  // Calculate offsets
  long ss_offset = start_time - rec_start_time;
  if (ss_offset < 0)
    ss_offset = 0;

  long duration = end_time - start_time;
  if (duration <= 0)
    duration = 1;

  // Generate output filename
  char out_filename[256];
  snprintf(out_filename, sizeof(out_filename), "clip_%s_%ld_%ld.mp4",
           stream_name, start_time, end_time);

  char out_full_path[512];
  snprintf(out_full_path, sizeof(out_full_path), "%s/%s", EXPORTS_DIR,
           out_filename);

  // Build FFmpeg command
  // ffmpeg -ss [offset] -i [input] -t [duration] -c copy [output]
  // Note: -ss before -i is faster (input seeking) but -ss after -i is more
  // frame-accurate (output seeking). For "copy", input seeking is usually
  // keyframe aligned. Output seeking decoding. If we want accurate clips
  // without re-encoding, we might suffer from keyframe snapping. Re-encoding is
  // slow on Pi. Let's try copy first. Command: ffmpeg -ss [offset] -i [input]
  // -t [duration] -c copy -y [output]

  char cmd[1024];
  snprintf(cmd, sizeof(cmd),
           "ffmpeg -ss %ld -i \"%s\" -t %ld -c copy -y \"%s\" > /dev/null 2>&1",
           ss_offset, source_path, duration, out_full_path);

  log_info("Executing clip command: %s", cmd);

  int ret = system(cmd);

  if (ret == 0) {
    // Success
    mg_http_reply(c, 200, "Content-Type: application/json\r\n",
                  "{\"success\":true, \"filename\":\"%s\"}", out_filename);
  } else {
    log_error("Clipping failed with code %d", ret);
    mg_http_reply(c, 500, "Content-Type: application/json\r\n",
                  "{\"error\":\"Encoding failed\"}");
  }
}

void mg_handle_post_clips_export(struct mg_connection *c,
                                 struct mg_http_message *hm) {
  cJSON *body = mg_parse_json_body(hm);
  if (!body) {
    mg_http_reply(c, 400, "Content-Type: application/json\r\n",
                  "{\"error\":\"Invalid JSON\"}");
    return;
  }

  cJSON *filename_json = cJSON_GetObjectItem(body, "filename");
  cJSON *dest_path_json = cJSON_GetObjectItem(body, "dest_path");

  if (!cJSON_IsString(filename_json) || !cJSON_IsString(dest_path_json)) {
    cJSON_Delete(body);
    mg_http_reply(c, 400, "Content-Type: application/json\r\n",
                  "{\"error\":\"Missing parameters\"}");
    return;
  }

  const char *filename = filename_json->valuestring;
  const char *dest_path = dest_path_json->valuestring;

  // Sanitize filename
  if (strstr(filename, "..") || strchr(filename, '/')) {
    cJSON_Delete(body);
    mg_http_reply(c, 400, "Content-Type: application/json\r\n",
                  "{\"error\":\"Invalid filename\"}");
    return;
  }

  char src_full_path[512];
  snprintf(src_full_path, sizeof(src_full_path), "%s/%s", EXPORTS_DIR,
           filename);

  char dest_full_path[1024];
  snprintf(dest_full_path, sizeof(dest_full_path), "%s/%s", dest_path,
           filename);

  // Copy command: cp "src" "dest"
  char cmd[2048];
  snprintf(cmd, sizeof(cmd), "cp \"%s\" \"%s\"", src_full_path, dest_full_path);

  log_info("Exporting clip: %s", cmd);
  int ret = system(cmd);

  cJSON_Delete(body);

  if (ret == 0) {
    mg_http_reply(c, 200, "Content-Type: application/json\r\n",
                  "{\"success\":true}");
  } else {
    mg_http_reply(c, 500, "Content-Type: application/json\r\n",
                  "{\"error\":\"Copy failed\"}");
  }
}

void mg_handle_post_clips_export_range(struct mg_connection *c,
                                       struct mg_http_message *hm) {
  cJSON *body = mg_parse_json_body(hm);
  if (!body) {
    mg_http_reply(c, 400, "Content-Type: application/json\r\n",
                  "{\"error\":\"Invalid JSON\"}");
    return;
  }

  cJSON *stream_name_json = cJSON_GetObjectItem(body, "stream_name");
  cJSON *start_time_json = cJSON_GetObjectItem(body, "start_time");
  cJSON *end_time_json = cJSON_GetObjectItem(body, "end_time");

  if (!cJSON_IsString(stream_name_json) || !cJSON_IsNumber(start_time_json) ||
      !cJSON_IsNumber(end_time_json)) {
    cJSON_Delete(body);
    mg_http_reply(c, 400, "Content-Type: application/json\r\n",
                  "{\"error\":\"Missing or invalid parameters\"}");
    return;
  }

  const char *stream_name = stream_name_json->valuestring;
  time_t start_time = (time_t)start_time_json->valuedouble;
  time_t end_time = (time_t)end_time_json->valuedouble;

  if (end_time <= start_time) {
    cJSON_Delete(body);
    mg_http_reply(c, 400, "Content-Type: application/json\r\n",
                  "{\"error\":\"Invalid time range: end_time must be after start_time\"}");
    return;
  }

  recording_metadata_t recordings[100];
  int rec_count = get_recording_metadata(start_time, end_time, stream_name, recordings, 100);

  if (rec_count <= 0) {
    cJSON_Delete(body);
    mg_http_reply(c, 404, "Content-Type: application/json\r\n",
                  "{\"error\":\"No recordings found in the specified time range\"}");
    return;
  }

  char out_filename[256];
  snprintf(out_filename, sizeof(out_filename), "export_%s_%ld_%ld.mp4",
           stream_name, (long)start_time, (long)end_time);

  char out_full_path[512];
  snprintf(out_full_path, sizeof(out_full_path), "%s/%s", EXPORTS_DIR, out_filename);

  if (rec_count == 1) {
    recording_metadata_t *rec = &recordings[0];
    
    if (access(rec->file_path, F_OK) != 0) {
      cJSON_Delete(body);
      log_error("Recording file not found: %s", rec->file_path);
      mg_http_reply(c, 404, "Content-Type: application/json\r\n",
                    "{\"error\":\"Recording file not found\"}");
      return;
    }

    long ss_offset = start_time - rec->start_time;
    if (ss_offset < 0) ss_offset = 0;
    
    long duration = end_time - start_time;
    if (duration <= 0) duration = 1;

    char cmd[1024];
    snprintf(cmd, sizeof(cmd),
             "ffmpeg -ss %ld -i \"%s\" -t %ld -c copy -y \"%s\" > /dev/null 2>&1",
             ss_offset, rec->file_path, duration, out_full_path);

    log_info("Executing single-file export command: %s", cmd);
    int ret = system(cmd);

    cJSON_Delete(body);

    if (ret == 0) {
      mg_http_reply(c, 200, "Content-Type: application/json\r\n",
                    "{\"success\":true, \"filename\":\"%s\"}", out_filename);
    } else {
      log_error("Export failed with code %d", ret);
      mg_http_reply(c, 500, "Content-Type: application/json\r\n",
                    "{\"error\":\"Export encoding failed\"}");
    }
    return;
  }

  char concat_list_path[512];
  snprintf(concat_list_path, sizeof(concat_list_path), "%s/concat_%ld.txt", 
           EXPORTS_DIR, (long)time(NULL));

  FILE *concat_file = fopen(concat_list_path, "w");
  if (!concat_file) {
    cJSON_Delete(body);
    log_error("Failed to create concat list file: %s", concat_list_path);
    mg_http_reply(c, 500, "Content-Type: application/json\r\n",
                  "{\"error\":\"Failed to create temporary concat file\"}");
    return;
  }

  for (int i = 0; i < rec_count; i++) {
    if (access(recordings[i].file_path, F_OK) == 0) {
      fprintf(concat_file, "file '%s'\n", recordings[i].file_path);
    } else {
      log_warn("Skipping missing file: %s", recordings[i].file_path);
    }
  }

  fclose(concat_file);

  char cmd[1024];
  snprintf(cmd, sizeof(cmd),
           "ffmpeg -f concat -safe 0 -i \"%s\" -c copy -y \"%s\" > /dev/null 2>&1",
           concat_list_path, out_full_path);

  log_info("Executing multi-file export command: %s", cmd);
  int ret = system(cmd);

  unlink(concat_list_path);

  cJSON_Delete(body);

  if (ret == 0) {
    mg_http_reply(c, 200, "Content-Type: application/json\r\n",
                  "{\"success\":true, \"filename\":\"%s\"}", out_filename);
  } else {
    log_error("Multi-file export failed with code %d", ret);
    mg_http_reply(c, 500, "Content-Type: application/json\r\n",
                  "{\"error\":\"Export encoding failed\"}");
  }
}

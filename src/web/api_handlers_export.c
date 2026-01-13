#define _XOPEN_SOURCE
#define _GNU_SOURCE

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <time.h>
#include <unistd.h>

#include "core/config.h"
#include "core/logger.h"
#include "database/database_manager.h"
#include "database/db_recordings.h"
#include "mongoose.h"
#include "web/api_handlers.h"
#include "web/api_handlers_timeline.h" // For get_timeline_segments
#include "web/mongoose_adapter.h"

// Function to handle getting removable storage devices
void mg_handle_get_storage_removable(struct mg_connection *c,
                                     struct mg_http_message *hm) {
  log_info("Handling GET /api/storage/removable");

  // Get the configured storage path from config
  extern config_t g_config;
  char export_path[512];
  snprintf(export_path, sizeof(export_path), "%s/export",
           g_config.storage_path);

  // Create export directory if it doesn't exist
  mkdir(export_path, 0755);

  // Execute lsblk to get JSON output of block devices
  char cmd[] = "lsblk -J -o NAME,MOUNTPOINT,SIZE,MODEL,TYPE,TRAN 2>/dev/null "
               "|| echo '{\"blockdevices\":[]}'";
  FILE *fp = popen(cmd, "r");

  if (!fp) {
    // If lsblk fails, just return local export option
    char response[1024];
    snprintf(response, sizeof(response),
             "{\"blockdevices\":[],\"local_export\":{\"path\":\"%s\",\"name\":"
             "\"Local Export Folder\",\"size\":\"N/A\"}}",
             export_path);
    mg_http_reply(c, 200,
                  "Content-Type: application/json\r\n"
                  "Connection: close\r\n",
                  "%s", response);
    return;
  }

  // Read output with fixed buffer (lsblk output is typically small)
  char buffer[8192] = {0};
  size_t total_read = 0;
  size_t chunk_read;

  while (total_read < sizeof(buffer) - 1 &&
         (chunk_read = fread(buffer + total_read, 1,
                             sizeof(buffer) - total_read - 1, fp)) > 0) {
    total_read += chunk_read;
  }

  pclose(fp);

  buffer[total_read] = '\0';

  // Parse the JSON to add local export option
  // For simplicity, manually construct response with local export added
  char response[10240];

  if (total_read == 0 || strstr(buffer, "\"blockdevices\":[]") != NULL) {
    // No removable devices found, return only local export
    snprintf(response, sizeof(response),
             "{\"blockdevices\":[],\"local_export\":{\"path\":\"%s\",\"name\":"
             "\"Local Export Folder\",\"size\":\"Available\"}}",
             export_path);
  } else {
    // Add local export to the existing devices
    // Find the closing brace of blockdevices array and insert local_export
    // before final }
    char *last_brace = strrchr(buffer, '}');
    if (last_brace) {
      size_t prefix_len = last_brace - buffer;
      snprintf(response, sizeof(response),
               "%.*s,\"local_export\":{\"path\":\"%s\",\"name\":\"Local Export "
               "Folder\",\"size\":\"Available\"}}",
               (int)prefix_len, buffer, export_path);
    } else {
      // Fallback if parsing fails
      snprintf(response, sizeof(response),
               "{\"blockdevices\":[],\"local_export\":{\"path\":\"%s\","
               "\"name\":\"Local Export Folder\",\"size\":\"Available\"}}",
               export_path);
    }
  }

  // Send the JSON response using mg_http_reply
  mg_http_reply(c, 200,
                "Content-Type: application/json\r\n"
                "Connection: close\r\n",
                "%s", response);
}

// Function to handle video export
void mg_handle_post_export(struct mg_connection *c,
                           struct mg_http_message *hm) {
  log_info("*******************************************************************"
           "****");
  log_info("************************ EXPORT STARTED "
           "*******************************");
  log_info("*******************************************************************"
           "****");
  log_info("Handling POST /api/export");

  // Parse JSON body
  struct mg_str body = hm->body;
  char *body_str = strndup(body.buf, body.len);

#include <cjson/cJSON.h>

  cJSON *json = cJSON_Parse(body_str);
  if (!json) {
    free(body_str);
    mg_send_json_error(c, 400, "Invalid JSON");
    return;
  }

  // Extract parameters
  cJSON *j_stream = cJSON_GetObjectItem(json, "stream");
  cJSON *j_start = cJSON_GetObjectItem(json, "start");
  cJSON *j_end = cJSON_GetObjectItem(json, "end");
  cJSON *j_device = cJSON_GetObjectItem(json, "device_path");

  if (!j_stream || !j_start || !j_end || !j_device) {
    cJSON_Delete(json);
    free(body_str);
    mg_send_json_error(c, 400, "Missing required parameters");
    return;
  }

  char *stream_name = j_stream->valuestring;
  char *start_time_str = j_start->valuestring;
  char *end_time_str = j_end->valuestring;
  char *device_path = j_device->valuestring;

  log_info("Export received: stream='%s', start='%s', end='%s', dest='%s'",
           stream_name, start_time_str, end_time_str, device_path);

  // Parse timestamps
  struct tm tm = {0};
  time_t start_time = 0, end_time = 0;

  if (strptime(start_time_str, "%Y-%m-%dT%H:%M:%S", &tm)) {
    start_time = timegm(&tm);
    log_info("Parsed start_time: '%s' -> %ld (year=%d, month=%d, day=%d, "
             "hour=%d, min=%d, sec=%d)",
             start_time_str, (long)start_time, tm.tm_year + 1900, tm.tm_mon + 1,
             tm.tm_mday, tm.tm_hour, tm.tm_min, tm.tm_sec);
  } else {
    log_error("Failed to parse start_time: '%s'", start_time_str);
  }
  memset(&tm, 0, sizeof(tm));
  if (strptime(end_time_str, "%Y-%m-%dT%H:%M:%S", &tm)) {
    end_time = timegm(&tm);
    log_info("Parsed end_time: '%s' -> %ld", end_time_str, (long)end_time);
  } else {
    log_error("Failed to parse end_time: '%s'", end_time_str);
  }

  // Verify device path exists or create it
  struct stat st;
  if (stat(device_path, &st) != 0) {
    // Try to create the directory
    mkdir(device_path, 0755);
  }

// Get recordings in the time range
#define MAX_EXPORT_RECORDINGS 1000
  recording_metadata_t *recordings = (recording_metadata_t *)malloc(
      MAX_EXPORT_RECORDINGS * sizeof(recording_metadata_t));

  if (!recordings) {
    free(body_str);
    mg_send_json_error(c, 500, "Memory allocation failed");
    return;
  }

  int count = get_recording_metadata_paginated(
      start_time, end_time, stream_name, -1, // -1 = ignore has_detection filter
      "start_time", "ASC", recordings, MAX_EXPORT_RECORDINGS, 0);

  log_info("Export search: stream=%s, start_time=%ld (%s), end_time=%ld (%s), "
           "found=%d recordings",
           stream_name, (long)start_time, start_time_str, (long)end_time,
           end_time_str, count);

  if (count <= 0) {
    free(recordings);
    cJSON_Delete(json);
    free(body_str);
    mg_send_json_error(c, 404, "No recordings found in selected time range");
    return;
  }

  log_info("Found %d recordings to export for stream %s", count, stream_name);

  // Create a file list for ffmpeg concat
  char playlist_path[512];
  snprintf(playlist_path, sizeof(playlist_path), "/tmp/export_playlist_%ld.txt",
           (long)time(NULL));

  FILE *fp = fopen(playlist_path, "w");
  if (!fp) {
    free(recordings);
    cJSON_Delete(json);
    free(body_str);
    log_error("Failed to create playlist file: %s", playlist_path);
    mg_send_json_error(c, 500, "Failed to create playlist file");
    return;
  }

  // Write all recording file paths to the playlist
  for (int i = 0; i < count; i++) {
    fprintf(fp, "file '%s'\n", recordings[i].file_path);
    log_info("Adding to playlist [%d/%d]: %s", i + 1, count,
             recordings[i].file_path);
  }
  fclose(fp);

  // Generate output filename with timestamp
  char output_filename[1024];
  snprintf(output_filename, sizeof(output_filename), "%s/%s_export_%ld_%ld.mp4",
           device_path, stream_name, (long)start_time, (long)end_time);

  // Build ffmpeg command for concatenation
  // Using -c copy for stream copy (no re-encoding, fast and lossless)
  char cmd[4096];
  snprintf(cmd, sizeof(cmd),
           "ffmpeg -y -f concat -safe 0 -i \"%s\" -c copy \"%s\" 2>&1",
           playlist_path, output_filename);

  log_info("Running ffmpeg concat: %s", cmd);

  // Execute ffmpeg
  int result = system(cmd);

  // Clean up playlist file
  unlink(playlist_path);

  free(recordings);
  cJSON_Delete(json);
  free(body_str);

  if (result == 0) {
    // Success response
    char response[1024];
    snprintf(response, sizeof(response),
             "{\"success\":true,\"copied\":1,\"failed\":0,\"total\":%d,"
             "\"destination\":\"%s\",\"output\":\"%s\"}",
             count, device_path, output_filename);

    mg_http_reply(c, 200,
                  "Content-Type: application/json\r\n"
                  "Connection: close\r\n",
                  "%s", response);

    log_info(
        "Export completed successfully: %d recordings concatenated into %s",
        count, output_filename);
  } else {
    char response[512];
    snprintf(response, sizeof(response),
             "{\"success\":false,\"error\":\"FFmpeg concatenation failed\"}");

    mg_http_reply(c, 500,
                  "Content-Type: application/json\r\n"
                  "Connection: close\r\n",
                  "%s", response);

    log_error("FFmpeg export failed with exit code: %d", result);
  }

  log_info("*******************************************************************"
           "****");
  log_info("************************ EXPORT FINISHED "
           "******************************");
  log_info("*******************************************************************"
           "****");
}

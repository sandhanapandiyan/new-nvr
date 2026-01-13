#define _XOPEN_SOURCE
#define _GNU_SOURCE

#include <ctype.h>
#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>

#include "core/logger.h"
#include "database/db_recordings.h"
#include "mongoose.h"
#include "web/api_handlers.h"
#include "web/api_handlers_recordings.h"
#include "web/api_handlers_storage.h"
#include "web/mongoose_adapter.h"
#include <cjson/cJSON.h>

// Helper to check if path is safe (starts with /media, /mnt, or local/exports)
static bool is_safe_path(const char *path) {
  if (!path)
    return false;
  // Allow /media and /mnt for external storage
  if (strncmp(path, "/media", 6) == 0)
    return true;
  if (strncmp(path, "/mnt", 4) == 0)
    return true;
  // Allow local/exports for clips
  if (strncmp(path, "local/exports", 13) == 0)
    return true;
  return false;
}

// ... (copy_file and serve_file_for_download remain the same) ...

void mg_handle_get_storage_download(struct mg_connection *c,
                                    struct mg_http_message *hm) {
  char path[512];
  if (mg_http_get_var(&hm->query, "path", path, sizeof(path)) <= 0) {
    mg_http_reply(c, 400, "", "{\"error\":\"Missing path\"}");
    return;
  }

  char preview[10];
  bool is_preview = false;
  if (mg_http_get_var(&hm->query, "preview", preview, sizeof(preview)) > 0) {
    if (strcmp(preview, "true") == 0)
      is_preview = true;
  }

  char decoded_path[512];
  mg_url_decode_string(path, decoded_path, sizeof(decoded_path));

  if (!is_safe_path(decoded_path)) {
    mg_http_reply(c, 403, "", "{\"error\":\"Access denied\"}");
    return;
  }

  struct stat st;
  if (stat(decoded_path, &st) != 0) {
    mg_http_reply(c, 404, "", "{\"error\":\"File not found\"}");
    return;
  }

  const char *filename = strrchr(decoded_path, '/');
  if (filename)
    filename++;
  else
    filename = decoded_path;

  if (is_preview) {
    // Serve inline for preview
    struct mg_http_serve_opts opts = {0};
    opts.mime_types = "mp4=video/mp4,jpg=image/jpeg,png=image/png";
    opts.extra_headers = "Content-Disposition: inline\r\n"
                         "Access-Control-Allow-Origin: *\r\n"
                         "Cache-Control: no-cache\r\n";
    mg_http_serve_file(c, hm, decoded_path, &opts);
  } else {
    serve_file_for_download(c, decoded_path, filename, st.st_size);
  }
}

// Copy file function
static int copy_file(const char *src_path, const char *dest_dir) {
  int src_fd = -1, dest_fd = -1;
  int ret = -1;
  char dest_path[1024];

  // Extract filename
  const char *filename = strrchr(src_path, '/');
  if (filename)
    filename++;
  else
    filename = src_path;

  snprintf(dest_path, sizeof(dest_path), "%s/%s", dest_dir, filename);

  src_fd = open(src_path, O_RDONLY);
  if (src_fd < 0) {
    log_error("Failed to open source file %s: %s", src_path, strerror(errno));
    goto cleanup;
  }

  dest_fd = open(dest_path, O_WRONLY | O_CREAT | O_TRUNC, 0644);
  if (dest_fd < 0) {
    log_error("Failed to open dest file %s: %s", dest_path, strerror(errno));
    goto cleanup;
  }

  char buf[8192];
  ssize_t n;
  while ((n = read(src_fd, buf, sizeof(buf))) > 0) {
    if (write(dest_fd, buf, n) != n) {
      log_error("Write error to %s: %s", dest_path, strerror(errno));
      goto cleanup;
    }
  }

  if (n < 0) {
    log_error("Read error from %s: %s", src_path, strerror(errno));
    goto cleanup;
  }

  ret = 0;

cleanup:
  if (src_fd >= 0)
    close(src_fd);
  if (dest_fd >= 0)
    close(dest_fd);
  return ret;
}

void mg_handle_get_storage_devices(struct mg_connection *c,
                                   struct mg_http_message *hm) {
  FILE *fp = fopen("/proc/mounts", "r");
  if (!fp) {
    mg_http_reply(c, 500, "", "{\"error\":\"Failed to read mounts\"}");
    return;
  }

  cJSON *root = cJSON_CreateObject();
  cJSON *devices = cJSON_CreateArray();
  cJSON_AddItemToObject(root, "devices", devices);

  char line[512];
  while (fgets(line, sizeof(line), fp)) {
    char device[128], mount[128], fstype[64], opts[128];
    int d1, d2;
    // Parse standard mount line
    if (sscanf(line, "%127s %127s %63s %127s %d %d", device, mount, fstype,
               opts, &d1, &d2) == 6) {
      if (strncmp(mount, "/media", 6) == 0 || strncmp(mount, "/mnt", 4) == 0) {
        cJSON *dev = cJSON_CreateObject();
        cJSON_AddStringToObject(dev, "device", device);
        cJSON_AddStringToObject(dev, "mount_point", mount);
        cJSON_AddStringToObject(dev, "fstype", fstype);
        cJSON_AddItemToArray(devices, dev);
      }
    }
  }
  fclose(fp);

  char *json_str = cJSON_PrintUnformatted(root);
  mg_http_reply(c, 200, "Content-Type: application/json\r\n", "%s", json_str);
  free(json_str);
  cJSON_Delete(root);
}

void mg_handle_get_storage_files(struct mg_connection *c,
                                 struct mg_http_message *hm) {
  char path[512];
  if (mg_http_get_var(&hm->query, "path", path, sizeof(path)) <= 0) {
    mg_http_reply(c, 400, "", "{\"error\":\"Missing path\"}");
    return;
  }

  char decoded_path[512];
  mg_url_decode_string(path, decoded_path, sizeof(decoded_path));

  if (!is_safe_path(decoded_path)) {
    mg_http_reply(c, 403, "", "{\"error\":\"Access denied to this path\"}");
    return;
  }

  DIR *d = opendir(decoded_path);
  if (!d) {
    mg_http_reply(c, 404, "", "{\"error\":\"Failed to open directory\"}");
    return;
  }

  cJSON *root = cJSON_CreateObject();
  cJSON *files = cJSON_CreateArray();
  cJSON_AddItemToObject(root, "files", files);

  struct dirent *dir;
  while ((dir = readdir(d)) != NULL) {
    if (dir->d_name[0] == '.')
      continue;

    char full_path[1024];
    snprintf(full_path, sizeof(full_path), "%s/%s", decoded_path, dir->d_name);
    struct stat st;
    if (stat(full_path, &st) == 0) {
      cJSON *f = cJSON_CreateObject();
      cJSON_AddStringToObject(f, "name", dir->d_name);
      cJSON_AddNumberToObject(f, "size", st.st_size);
      cJSON_AddBoolToObject(f, "is_dir", S_ISDIR(st.st_mode));
      cJSON_AddItemToArray(files, f);
    }
  }
  closedir(d);

  char *json_str = cJSON_PrintUnformatted(root);
  mg_http_reply(c, 200, "Content-Type: application/json\r\n", "%s", json_str);
  free(json_str);
  cJSON_Delete(root);
}

void mg_handle_post_storage_export(struct mg_connection *c,
                                   struct mg_http_message *hm) {
  cJSON *json = mg_parse_json_body(hm);
  if (!json) {
    mg_http_reply(c, 400, "", "{\"error\":\"Invalid JSON\"}");
    return;
  }

  cJSON *rec_id_obj = cJSON_GetObjectItem(json, "recording_id");
  cJSON *dest_path_obj = cJSON_GetObjectItem(json, "dest_path");

  if (!rec_id_obj || !dest_path_obj || !cJSON_IsNumber(rec_id_obj) ||
      !cJSON_IsString(dest_path_obj)) {
    cJSON_Delete(json);
    mg_http_reply(c, 400, "",
                  "{\"error\":\"Missing recording_id or dest_path\"}");
    return;
  }

  int recording_id = rec_id_obj->valueint;
  const char *dest_path = dest_path_obj->valuestring;

  if (!is_safe_path(dest_path)) {
    cJSON_Delete(json);
    mg_http_reply(c, 403, "", "{\"error\":\"Invalid destination path\"}");
    return;
  }

  recording_metadata_t meta;
  if (get_recording_metadata_by_id(recording_id, &meta) != 0) {
    cJSON_Delete(json);
    mg_http_reply(c, 404, "", "{\"error\":\"Recording not found\"}");
    return;
  }

  int ret = copy_file(meta.file_path, dest_path);

  cJSON_Delete(json);

  if (ret == 0) {
    mg_http_reply(c, 200, "", "{\"success\":true}");
  } else {
    mg_http_reply(c, 500, "", "{\"error\":\"Failed to copy file\"}");
  }
}

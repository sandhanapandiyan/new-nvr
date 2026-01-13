#ifndef API_HANDLERS_TIMELINE_H
#define API_HANDLERS_TIMELINE_H

#include "mongoose.h"
#include <time.h>

#define MAX_STREAM_NAME 64
#define MAX_PATH_LENGTH 512

// Structure for timeline segment
typedef struct {
  uint64_t id;
  char stream_name[MAX_STREAM_NAME];
  char file_path[MAX_PATH_LENGTH];
  time_t start_time;
  time_t end_time;
  uint64_t size_bytes;
  bool has_detection;
} timeline_segment_t;

// API functions
void mg_handle_get_timeline_segments(struct mg_connection *c,
                                     struct mg_http_message *hm);
void mg_handle_timeline_manifest(struct mg_connection *c,
                                 struct mg_http_message *hm);
void mg_handle_timeline_playback(struct mg_connection *c,
                                 struct mg_http_message *hm);
void mg_handle_get_playback_continuous(struct mg_connection *c,
                                       struct mg_http_message *hm);

// Helper functions (exposed for testing/internal use)
int get_timeline_segments(const char *stream_name, time_t start_time,
                          time_t end_time, timeline_segment_t *segments,
                          int max_segments);

#endif // API_HANDLERS_TIMELINE_H

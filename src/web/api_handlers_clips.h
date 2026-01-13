#ifndef API_HANDLERS_CLIPS_H
#define API_HANDLERS_CLIPS_H

#include "mongoose.h"

// Initialize clips module (create exports directory)
void init_clips_module(void);

// Handle clip generation request
// POST /api/clips/generate
// Body: { "stream_name": "...", "start_time": 1234567890, "end_time":
// 1234567899 }
void mg_handle_post_clips_generate(struct mg_connection *c,
                                   struct mg_http_message *hm);

// Handle list exported clips request
// GET /api/clips
void mg_handle_get_clips(struct mg_connection *c, struct mg_http_message *hm);

// Handle delete clip request
// DELETE /api/clips?filename=...
// Handle clip export to external storage
// POST /api/clips/export
void mg_handle_post_clips_export(struct mg_connection *c,
                                 struct mg_http_message *hm);

// Handle time range video export (multiple segments)
// POST /api/clips/export-range
// Body: { "stream_name": "...", "start_time": 1234567890, "end_time": 1234567899 }
void mg_handle_post_clips_export_range(struct mg_connection *c,
                                       struct mg_http_message *hm);

void mg_handle_delete_clips(struct mg_connection *c,
                            struct mg_http_message *hm);

#endif // API_HANDLERS_CLIPS_H

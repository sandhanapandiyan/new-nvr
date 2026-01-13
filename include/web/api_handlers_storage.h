#ifndef API_HANDLERS_STORAGE_H
#define API_HANDLERS_STORAGE_H

#include "mongoose.h"

// List storage devices (removable)
void mg_handle_get_storage_devices(struct mg_connection *c,
                                   struct mg_http_message *hm);

// List files in a path
void mg_handle_get_storage_files(struct mg_connection *c,
                                 struct mg_http_message *hm);

// Download file from storage
void mg_handle_get_storage_download(struct mg_connection *c,
                                    struct mg_http_message *hm);

// Export (copy) recording to storage
void mg_handle_post_storage_export(struct mg_connection *c,
                                   struct mg_http_message *hm);

#endif // API_HANDLERS_STORAGE_H

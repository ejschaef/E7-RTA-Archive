from flask import has_request_context, request
import logging
from apps.log_ip_hash import hash_ip

class RequestInfoFilter(logging.Filter):
    def filter(self, record) -> bool:
        if has_request_context():
            record.ip = hash_ip(request.remote_addr)
            record.url = request.url
        else:
            record.ip = None
            record.url = None
        return True
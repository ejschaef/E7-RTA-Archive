import logging
from typing import override
import json
import datetime as dt

class JsonLogFormatter(logging.Formatter):


    def __init__(self, *, fmt_keys):
        super().__init__()
        self.fmt_keys = fmt_keys if fmt_keys is not None else {}

    @override
    def format(self, record):
        message = self.__prep_log_dict(record)
        return json.dumps(message, default=str)
    
    def __prep_log_dict(self, record: logging.LogRecord):
        required_fields = {
            "timestamp": dt.datetime.fromtimestamp(record.created, tz=dt.timezone.utc).isoformat(),
            "message"  : record.getMessage(),
        }
        if record.exc_info is not None:
            required_fields["exc_info"] = self.formatException(record.exc_info)
        
        if record.stack_info is not None:
            required_fields["stack_info"] = self.formatStack(record.stack_info)

        message = {
            key : msg
            if (msg := required_fields.pop(val, None)) is not None
            else getattr(record, val)
            for key, val in self.fmt_keys.items()
        }
        message.update(required_fields)
        return message

from config import Config
import pandas as pd
from logger import log_error, log_info  


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS


def normalize_mobile_number(mobile_number): 
    mobile_number = str(mobile_number)
    
    if not mobile_number.startswith('0'):
        return '0' + mobile_number
    return mobile_number


def sanitize_for_json(value):
    if isinstance(value, str): 
        return ''.join(c for c in value if c.isprintable())
    return value


def map_plate_letter(task):
    
    plate_letter_map = {
            "الف": "1",
            "ب": "2",
            "پ": "3",
            "ت": "4",
            "ث": "5",
            "ج": "6",
            "چ": "7",
            "ح": "8",
            "خ": "9",
            "د": "10",
            "ذ": "11",
            "ر": "12",
            "ز": "13",
            "ژ": "14",
            "س": "15",
            "ش": "16",
            "ص": "17",
            "ض": "18",
            "ط": "19",
            "ظ": "20",
            "ع": "21",
            "غ": "22",
            "ف": "23",
            "ق": "24",
            "ک": "25",
            "گ": "26",
            "ل": "27",
            "م": "28",
            "ن": "29",
            "و": "30",
            "ه": "31",
            "ی": "32"
        }
    
    return plate_letter_map.get(task.plate_letter, "")


def check_nan(value):
    if pd.isna(value):
        return "-"
    return str(value)


def log_task_status(task, status, message, tracking_code=None, error_details=None): 
    
    log_message = f"Task for username '{task.username}' - Status: {status} - Message: {message}"

    if tracking_code:
        log_message += f" - Tracking Code: {tracking_code}"

    if error_details:
        log_message += f" - Error Details: {error_details}"

    if status.lower() == "error":
        log_error(log_message)
    else:
        log_info(log_message)

        
def get_settings():
    return {
        "retry_on_error": Config.RETRY_ON_ERROR,
        "auto_save_logs": Config.AUTO_SAVE_LOGS,
        "auto_scroll_list": Config.AUTO_SCROLL_LIST,
        "use_free_account": Config.USE_FREE_ACCOUNT,
        "retry_count": Config.RETRY_COUNT,
        "request_interval": Config.REQUEST_INTERVAL,
        "delay_interval": Config.DELAY_INTERVAL,
        "page_size": Config.PAGE_SIZE,
        "chunk_size": Config.CHUNK_SIZE,
        "status_not_registered": Config.REGISTRATION_STATUS_NOT_REGISTERED,
        "status_registered": Config.REGISTRATION_STATUS_REGISTERED,
        "status_error": Config.REGISTRATION_STATUS_ERROR,
        "status_try_again": Config.REGISTRATION_STATUS_TRY_AGAIN,
        "status_under_progress": Config.REGISTRATION_STATUS_UNDER_PROGRESS,
    }
    
def get_status_text(status):
    status_mapping = {
        Config.REGISTRATION_STATUS_NOT_REGISTERED: "ثبت نشده",
        Config.REGISTRATION_STATUS_REGISTERED: "موفق",
        Config.REGISTRATION_STATUS_ERROR: "ناموفق",
        Config.REGISTRATION_STATUS_TRY_AGAIN: "در حال ثبت",
    }

    return status_mapping.get(status, "ثبت نشده")
    

    


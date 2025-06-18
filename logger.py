import logging
from logging.handlers import RotatingFileHandler
import os

 
LOG_FOLDER = "logs"
if not os.path.exists(LOG_FOLDER):
    os.makedirs(LOG_FOLDER)

 
LOG_FILE = os.path.join(LOG_FOLDER, "log")
logger = logging.getLogger("AppLogger")
logger.setLevel(logging.INFO)

 
file_handler = RotatingFileHandler(LOG_FILE, maxBytes=5*1024*1024, backupCount=3, encoding="utf-8")
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)

logger.addHandler(file_handler)

def log_info(message):
    logger.info(message)

def log_error(message):
    logger.error(message)

def log_warning(message):
    logger.warning(message)

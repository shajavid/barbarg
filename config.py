import os

class Config:
    SECRET_KEY = 'your_secret_key'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///database.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CELERY_BROKER_URL = 'redis://localhost:6379/0'
    CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
    ALLOWED_EXTENSIONS = {'xlsx','xls'}
    SQLALCHEMY_TRACK_MODIFICATIONS  = False
    SQLALCHEMY_DATABASE_URI = 'sqlite:///db'
    DEBUG = True
    SECRET_KEY = 'your_secret_key'
    LOGIN_URL = 'https://baarbarg.ir/Default.aspx'
    REAL_URL = 'https://baarbarg.ir/Account/FormDocumentDetailsRegister.aspx'
    DELAY_INTERVAL = 0
    RETRY_ON_ERROR = True
    AUTO_SAVE_LOGS = True
    AUTO_SCROLL_LIST = True
    USE_FREE_ACCOUNT = False
    RETRY_COUNT = 3
    REQUEST_INTERVAL = 10
    PAGE_SIZE = 500
    CHUNK_SIZE = 500
    TASKS_FILE = 'app/data/tasks.json'
    REPORTS_FOLDER = 'reports'
    worker_concurrency=10,  
    worker_prefetch_multiplier=1,   
    task_acks_late=True,
    REGISTRATION_STATUS_NOT_REGISTERED = 0
    REGISTRATION_STATUS_REGISTERED = 1
    REGISTRATION_STATUS_ERROR = 2
    REGISTRATION_STATUS_TRY_AGAIN = 3
    REGISTRATION_STATUS_UNDER_PROGRESS = 4
    SERVER_ERROR_CODE = 1
    APP_ERROR_CODE = 2
    TIME_LIMIT_CODE = 4001

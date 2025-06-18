from config import Config 

request_interval = Config.REQUEST_INTERVAL
class Messages:
    MESSAGE_LOGIN_FAIL = 'نام کاربری یا رمز عبور اشتباه است.'
    MESSAGE_LOGIN_SUCCESS = 'با موفقیت وارد شدید.'
    MESSAGE_NOT_FOUND = 'اکانتی با این مشخصات یافت نشد!'
    MESSAGE_SEND_BARBARG_FAIL = 'ارسال باربرگ ناموفق بود.'
    MESSAGE_SEND_BARBARG_SUCCESS = 'ارسال باربرگ حقیقی با موفقیت ثبت شد.'
    MESSAGE_TASK_COMPLETED = "این تسک قبلاً به پایان رسیده است و نیازی به اقدام بیشتر نیست."
    MESSAGE_REQUEST_INTERVAL = "هنوز زمان لازم برای ارسال مجدد درخواست نرسیده است."
    MESSAGE_DELAY_INTERVAL = "لطفاً قبل از ارسال درخواست دیگر کمی صبر کنید."
    MESSAGE_TIME_LIMIT = "به محدودیت زمانی برای این عملیات رسیده‌اید."
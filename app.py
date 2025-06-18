from flask import Flask, request, render_template, redirect, url_for, jsonify
from config import Config
from extensions import db 
from celery_worker import make_celery
from services.task_manager import TaskManager
from utils import get_settings, allowed_file, normalize_mobile_number, check_nan, \
    sanitize_for_json, log_task_status
import os
import pandas as pd
import random
from models import Task, initialize_database, Leg
from messages import Messages
from datetime import datetime, timedelta
from services.session_manager import SessionManager
from services.auth_manager import AuthManager
from services.real_manager import RealManager
from constant import Constant
import csv 
from flask.helpers import send_file
import utils
from services.leg_manager import LegManager

app = Flask(__name__) 
app.config.from_object(Config)

db.init_app(app) 

with app.app_context(): 
    db.create_all()
    
    meta = db.metadata
    for table in meta.tables.values():
        db.session.execute(table.delete())   
    db.session.commit()

celery = make_celery(app)

session_manager = SessionManager.get_instance()
session = session_manager.get_session()
captcha = session_manager.get_captcha() 

@app.route('/')
def index():
    page = request.args.get('page', 1, type=int)  
    size = request.args.get('size', 20, type=int)  

    tasks = TaskManager.load_tasks()  

    total_tasks = len(tasks)
    start = (page - 1) * size
    end = start + size
    paginated_tasks = tasks[start:end] 
    
    settings = get_settings()

    return render_template('index.html', tasks=paginated_tasks, total_tasks=total_tasks, page=page, size=size, settings=settings)

@app.route('/real')
def real():
    page = request.args.get('page', 1, type=int)  
    size = request.args.get('size', 20, type=int)  

    tasks = TaskManager.load_tasks()  

    total_tasks = len(tasks)
    start = (page - 1) * size
    end = start + size
    paginated_tasks = tasks[start:end]
    
    settings = get_settings()

    return render_template('real.html', tasks=paginated_tasks, total_tasks=total_tasks, page=page, size=size, settings=settings)

@app.route('/daily')
def daily():
    tasks = TaskManager.load_tasks()  
    
    settings = get_settings()

    return render_template('daily.html', tasks=tasks, settings=settings)

@app.route('/get_tasks', methods=['GET'])
def get_tasks():
        page = max(request.args.get('page', 1, type=int), 1)  
        size = request.args.get('size', 20, type=int)  

        all_tasks = TaskManager.load_tasks() 
        total_tasks = len(all_tasks)  

        start = (page - 1) * size
        end = start + size

        tasks = all_tasks[start:end]

        response = {
            "tasks": tasks,
            "total_tasks": total_tasks,
            "page": page,
            "size": size,
        }

        return jsonify(response)

@app.route('/get_legs', methods=['GET'])
def get_legs():
    page = max(request.args.get('page', 1, type=int), 1)
    size = request.args.get('size', 20, type=int)

    all_legs = LegManager.load_legs()   
    all_tasks = TaskManager.load_tasks()
    total_legs = len(all_legs)

    start = (page - 1) * size
    end = start + size

    legs = all_legs[start:end]
    
    all_legs = sum([task.get('count',0) for task in all_tasks if task.get('selected',False)])
    all_tasks = len([task for task in all_tasks if task.get('selected',False)])

    response = {
        "legs": legs,
        "total_legs": total_legs,
        "page": page,
        "size": size,
        "success_legs": len([leg for leg in legs if leg.get("registration_status") == Constant.REGISTRATION_STATUS_REGISTERED]),
        "error_legs": len([leg for leg in legs if leg.get("registration_status") == Constant.REGISTRATION_STATUS_ERROR]),
        "all_legs" : all_legs,
        "all_tasks" : all_tasks
    }

    return jsonify(response)
   
@app.route('/upload', methods=['POST'])
def upload_excel():
    try:
        if 'file' not in request.files:
            return redirect(url_for('index'))

        file = request.files['file']

        if file.filename == '':
            return redirect(url_for('index'))

        if file and allowed_file(file.filename): 
            filename = "tasks.xlsx"
            file_path = os.path.join(Config.UPLOAD_FOLDER, filename)
            file.save(file_path)

            df = pd.read_excel(file_path)
            
            bot_id = random.randint(1000, 9999)

            for index, row in df.iterrows():
                try:
                    row = row.tolist()

                    username = normalize_mobile_number(row[26]) 
                    password = row[27]
                    sender_name = check_nan(row[9])
                    sender_mobile = normalize_mobile_number(row[11])
                    sender_phone = check_nan(row[12])
                    sender_national_id = check_nan(row[10])
                    sender_postal_code = check_nan(row[13])
                    receiver_name = check_nan(row[16])
                    receiver_mobile = normalize_mobile_number(row[18])
                    receiver_phone = check_nan(row[19])
                    receiver_national_id = check_nan(row[17])
                    driver_national_id = row[5]
                    receiver_postal_code = check_nan(row[20])
                    iran_code = row[1]
                    plate_three_digit = row[2]
                    plate_letter = row[3]
                    plate_two_digit = row[4]
                    pelak = f"{plate_two_digit}{plate_letter}{plate_three_digit}ایران{iran_code}"
                    amount = float(row[7]) if pd.notna(row[7]) else 0
                    weight = float(row[6]) if pd.notna(row[6]) else 0
                    product_name = check_nan(row[23])
                    packaging_type = check_nan(row[24])
                    origin_lat = float(row[14]) if pd.notna(row[14]) else None
                    origin_lon = float(row[15]) if pd.notna(row[15]) else None
                    destination_lat = float(row[21]) if pd.notna(row[21]) else None
                    destination_lon = float(row[22]) if pd.notna(row[22]) else None
                    transfer_username = check_nan(row[25])
                    transfer_password = check_nan(row[26])
                    delay = int(row[28]) if pd.notna(row[28]) else Config.DELAY_INTERVAL
                    send_message_to_sender = False
                    insurance = False
                    value = float(row[8]) if pd.notna(row[8]) else 0

                    new_task = Task(
                        key=random.randint(1000, 9999),
                        bot_id=bot_id,
                        row_number=(index + 1),
                        username=username,
                        password=password,
                        sender_name=sender_name,
                        sender_mobile=sender_mobile,
                        sender_phone=sender_phone,
                        sender_national_id=sender_national_id,
                        sender_postal_code=sender_postal_code,
                        receiver_name=receiver_name,
                        receiver_mobile=receiver_mobile,
                        receiver_phone=receiver_phone,
                        receiver_national_id=receiver_national_id,
                        driver_national_id=driver_national_id,
                        receiver_postal_code=receiver_postal_code,
                        iran_code=iran_code,
                        pelak=pelak,
                        plate_three_digit=plate_three_digit,
                        plate_letter=plate_letter,
                        plate_two_digit=plate_two_digit,
                        amount=amount,
                        weight=weight,
                        product_name=product_name,
                        packaging_type=packaging_type,
                        origin_lat=origin_lat,
                        origin_lon=origin_lon,
                        destination_lat=destination_lat,
                        destination_lon=destination_lon,
                        transfer_username=transfer_username,
                        transfer_password=transfer_password,
                        text="",
                        count=5,
                        value=value,
                        delay=delay,
                        send_message_to_sender=send_message_to_sender,
                        insurance=insurance,
                        wallet_balance=0,
                        number_done=0,
                        selected=False
                        
                    )
                    db.session.add(new_task)
                    db.session.commit() 

                except Exception as e:
                    print(f"Error processing row {index}: {e}")
                    continue

            return redirect(url_for('index'))
        else:
            return redirect(url_for('index'))
    except Exception as e:
        print(f"An error occurred: {e}")
        return redirect(url_for('index'))

@app.route('/settings', methods=['GET'])
def settings():
    settings = get_settings()
    return render_template('index.html', settings=settings)

@app.route('/get_config', methods=['GET'])
def get_config():
    settings = get_settings()
    return jsonify(settings)

@app.route('/save_settings', methods=['POST'])
def save_settings():
    Config.RETRY_ON_ERROR = bool(request.form.get('retry_on_error'))
    Config.AUTO_SAVE_LOGS = bool(request.form.get('auto_save_logs'))
    Config.AUTO_SCROLL_LIST = bool(request.form.get('auto_scroll_list'))
    Config.USE_FREE_ACCOUNT = bool(request.form.get('use_free_account'))
    Config.RETRY_COUNT = int(request.form.get('retry_count', Config.RETRY_COUNT))
    Config.REQUEST_INTERVAL = int(request.form.get('request_interval', Config.REQUEST_INTERVAL))
    Config.DELAY_INTERVAL = int(request.form.get('delay_interval', Config.DELAY_INTERVAL))
    Config.CHUNK_SIZE = int(request.form.get('chunk_size', Config.DELAY_INTERVAL))

    return redirect(url_for('settings'))

@app.route('/generate_report', methods=['POST'])
def generate_report():
    try:
        report_filename = create_report()

        return jsonify({
            "message": "گزارش با موفقیت تولید شد.",
            "download_url": url_for('download_report', filename=report_filename, _external=True)
        }), 200
    except Exception as e:
        return jsonify({"error": f"خطا در تولید گزارش: {str(e)}"}), 500

@app.route('/download_report/<filename>', methods=['GET'])
def download_report(filename):
    try:
        report_filepath = os.path.join(Config.REPORTS_FOLDER, filename)
        if not os.path.exists(report_filepath):
            return jsonify({"error": "فایل گزارش پیدا نشد."}), 404
        return send_file(report_filepath, as_attachment=True, mimetype='text/csv; charset=utf-8')
    except Exception as e:
        return jsonify({"error": f"خطا در دانلود گزارش: {str(e)}"}), 500

@app.route('/reset', methods=['POST'])
def reset():
    TaskManager.delete_all()
    return redirect(url_for('main.index'))

@app.route('/update_task', methods=['POST'])
def update_task():
    # دریافت داده‌های ارسالی از کلاینت
    data = request.get_json()

    if not data or 'key' not in data:
        return jsonify({'success': False, 'error': 'داده‌ها نامعتبر است!'}), 400

    task_key = data['key']

    task = Leg.query.filter_by(key=task_key).first()
    if not task:
        return jsonify({'success': False, 'error': 'تسک یافت نشد!'}), 404

    allowed_fields = ['username', 'receiver_name', 'receiver_mobile', 'count', 'number_done', 'selected']
    
    for field, value in data.items():
        if field in allowed_fields and hasattr(task, field):
            setattr(task, field, value)

    try:
        db.session.commit() 
        return jsonify({'success': True, 'message': 'تسک با موفقیت به‌روزرسانی شد!'})
    except Exception as e:
        db.session.rollback()  # بازگشت از تغییرات در صورت خطا
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/select_all', methods=['POST'])
def select_all():
    data = request.get_json()

    if not data or 'selected' not in data:
        return jsonify({'success': False, 'error': 'داده‌ها نامعتبر است!'}), 400

    selected = data['selected']

    tasks = Task.query.all()

    for task in tasks:
        task.selected = selected

    try:
        db.session.commit()
        return jsonify({'success': True, 'message': 'تمام تسک‌ها با موفقیت انتخاب شدند!'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500 

@app.route('/send_barbarg/', methods=['POST'])
def send_barbarg():
    start_timer()
    return jsonify({"message":Messages.MESSAGE_SEND_BARBARG_SUCCESS}), 200

def start_timer():
    tasks = Task.query.all()
    
    for task in tasks:
        if task.selected:
            if task.number_done <= task.count : 
                legs_count = Leg.query.count()
                leg = Leg(
                    key=random.randint(1000, 9999),
                    task_id=task.id, 
                    leg_number= legs_count + 1,
                    row_number=task.row_number,
                    status="بابرگ ثبت نشده است",
                    last_request_time=None,
                    last_registered=None,
                    tracking_code="",
                    number_of_tries = 0,
                    registration_status=0,
                )
                db.session.add(leg)
                db.session.commit()
                barbarg_leg.apply_async(args=[leg.id])
            else:
                continue
        else:
            continue
    
@celery.task
def barbarg_leg(leg_id):
    leg = Leg.query.get(leg_id)
    
    if not leg:
        return 'Fail!'
    
    leg.status = "در حال ثبت باربرگ"
    leg.registration_status = Config.REGISTRATION_STATUS_UNDER_PROGRESS
    leg.number_of_tries += 1
    
    db.session.commit()
    
    task = leg.task
    
    if not leg:
            return
        
    phone = normalize_mobile_number(task.username)
    password = task.password
    
    if AuthManager.login(session, phone, password, captcha):
        response = RealManager.send(task, session, captcha)
        
        if not response.success:
            if response.code == Config.TIME_LIMIT_CODE:
                leg.status = sanitize_for_json(response.details)
                leg.registration_status = Config.REGISTRATION_STATUS_TRY_AGAIN
                leg.last_registered = datetime.now()
                
                if Config.RETRY_ON_ERROR == True:
                    if leg.number_of_tries >= Config.RETRY_COUNT:
                        leg.registration_status = Config.REGISTRATION_STATUS_ERROR
                        leg.status = sanitize_for_json(response.details)
                        db.session.commit()
                        log_task_status(task, "Error", "Failed to send ", error_details=response.details)
                        return "Fail!"
                    else: 
                        barbarg_leg.apply_async(args=[leg.id], countdown=Config.REQUEST_INTERVAL * 60)

            else:
                leg.registration_status = Config.REGISTRATION_STATUS_ERROR
                leg.status = sanitize_for_json(response.details)
            
            db.session.commit()            
            log_task_status(task, "Error", "Failed to send ", error_details=response.details)            
            return "Fail!"
    
        else:
            leg.status = sanitize_for_json(response.result['resultMessage'])
            leg.tracking_code = response.result['obj']
            leg.registration_status = Config.REGISTRATION_STATUS_REGISTERED
            leg.last_registered = datetime.now()
            
            db.session.commit()  
            
            task.number_done += 1
            db.session.commit()
            
            if task.number_done == task.count:
                task.selected = False
                db.session.commit()
            else:
                legs_count = Leg.query.count()
                leg = Leg(
                    key=random.randint(1000, 9999),
                    task_id=task.id,
                    leg_number=legs_count + 1,
                    row_number = task.row_number,
                    status="باربرگ ثبت نشده است",
                    last_request_time=None,
                    last_registered=None,
                    number_of_tries = 0,
                    tracking_code="",
                    registration_status=0,
                )
                db.session.add(leg)
                db.session.commit()
                barbarg_leg.apply_async(args=[leg.id])
            
            log_task_status(task, "Success", "Barbarg successfully sent.", tracking_code=leg.tracking_code)            
            return "Success!"
    
    else:
        leg.status = Messages.MESSAGE_LOGIN_FAIL
        leg.registration_status = Constant.REGISTRATION_STATUS_ERROR
        leg.last_registered = datetime.now()
        
        db.session.commit()        
        log_task_status(task, "Error", "Authrntication fail!", error_details=Messages.MESSAGE_LOGIN_FAIL)        
        return "Fail!"
    
def create_report():
    legs = LegManager.load_legs()

    report_filename = f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    report_filepath = os.path.join(Config.REPORTS_FOLDER, report_filename)
    
    os.makedirs(Config.REPORTS_FOLDER, exist_ok=True)

    with open(report_filepath, mode='w', newline='', encoding='utf-8-sig') as csvfile:
        fieldnames = [
        "ردیف", "ردیف اکسل", "پلاک خودرو", "وضعیت ثبت", "کد رهگیری",
        "وضعیت", "اکانت ثبت کننده", "تایمر", "نام ثبت کننده", "نام راننده"
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()

        for idx, leg in enumerate(legs, start=1):
                writer.writerow({
                    "ردیف": leg.get("row_number", ""),
                    "ردیف اکسل": leg.get("leg_number", ""),
                    "پلاک خودرو": leg.get("pelak", ""),
                    "وضعیت ثبت": utils.get_status_text(leg.get("registration_status", "")),
                    "کد رهگیری": leg.get("tracking_code", ""),
                    "وضعیت": leg.get("status", ""),
                    "اکانت ثبت کننده": leg.get("username", ""),
                    "تایمر": leg.get("delay", "0 ثانیه"),
                    "نام ثبت کننده": leg.get("receiver_name", ""),
                    "نام راننده": leg.get("sender_name", "")
                })
    return report_filename
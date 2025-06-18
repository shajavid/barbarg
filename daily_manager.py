from services.task_manager import TaskManager
from services.driver_manager import DriverManager
from utils import map_plate_letter
from services.session_manager import SessionManager
import json
from datetime import datetime, timedelta
import jdatetime

class DailyManager:

    @staticmethod
    def send(task, date):
        try:
            session_manager = SessionManager.get_instance()
        
            session = session_manager.get_session() 
            captcha = session_manager.get_captcha()
        
            tasks = TaskManager.load_tasks()
            
            driver_info = DriverManager.search(task)
            
            if driver_info['status'] is False:
                return {"error": "خطای راننده", "details":driver_info['message'], "code":3901}
            
            driver_info = driver_info['data']
            
            today_gregorian = datetime.now() 
            
            seven_days_ago = today_gregorian - timedelta(days=7)
            seven_days_later = today_gregorian + timedelta(days=7) 
            
            date_received = datetime.strptime(date, '%Y-%m-%d')
            
            tomorrow_jalali = jdatetime.date.fromgregorian(date=date_received)   
            tomorrow_str = tomorrow_jalali.strftime('%Y/%m/%d')  
            
            if not (seven_days_ago <= date_received <= seven_days_later):
                message = f"تاریخ خارج از بازه معتبر است. باید در بازه هفت روز گذشته تا هفت روز آینده باشد تاریخ : {tomorrow_str}"
                return {"error": "خطای تاریخ", "details":message, "code":3902}
            
            t1 = int(task.get("iran_code", ""))
            t2 = int(task.get("plate_two_digit", ""))
            t3 = int(map_plate_letter(task))   
            t4 = int(task.get("plate_three_digit", ""))
            
            plaque_info = DriverManager.plaque_search(t1, t2, t3, t4)        
            
            payload = {
                'truckTagType': 'false',
                't1': t1,
                't2': t2,
                't3': t3,
                't4': t4,
                'Capacity': '6',
                'truckHaveCertificate': 'true',
                'truckType': plaque_info.get('truckTypeName', 'باری دیزلی (گازوئیلی)'),
                'have3rdInsurance': 'true',
                'date': tomorrow_str,
                'driverNationalCode': driver_info.get('driverNationalCode', '3199893953'),
                'driverFullName': driver_info.get('fullName', 'علي پورشيخعلي'),
                'driverCertificateNumber': driver_info.get('driverCertificateNumber', '9505670387'),
                'driverMobile': driver_info.get('driverMobile', '9135833343'),
                'driverRank': task.get('driverRank', 0),
                'zoneStateIds': task.get('zoneStateIds', 9),
                'zoneCityIds': task.get('zoneCityIds', 7376),
                'notifyCost': task.get('notifyCost', 0),
                'IT_cost': task.get('IT_cost', 0),
                'avarez': task.get('avarez', 0),
                'toPay': task.get('toPay', 0),
                'status': task.get('status', 3),
                'freighterId': task.get('freighterId', ''),
                'captcha': captcha,
                'function': 'btnRegisterclick'
            }

            final_data = payload  # urllib.parse.urlencode(payload)    

            bond_response = session.post(
                url='https://baarbarg.ir/Account/BondCarryingRosanne.aspx',
                data=final_data
            )

            if bond_response.status_code == 200:
                bond_result = json.loads(bond_response.text)
                if bond_result['resultCode'] == 200:
                    task['number_done'] += 1
                    tasks[task['username']] = task
                    TaskManager.save_tasks(tasks)
                    message = f"کاربر {task.get('username')} : باربرگ روزانه برای تاریخ {tomorrow_str} با موفقیت ثبت شد."
                    return {"message": message, "result": bond_result['resultMessage'], "code":3900}
                else:
                    message = f"کاربر {task.get('username')} : خطا در ارسال باربرگ روزانه تاریخ : {tomorrow_str} : {bond_result['resultMessage']} "
                    return {"error": message, "details": message, "code":3901}
            else:
                message = f"کاربر {task.get('username')} : خطا در ارسال باربرگ روزانه تاریخ : {tomorrow_str} : {bond_result['resultMessage']}"
                return {"error": message, "status_code": bond_response.status_code, 'details':message, "code":3902}
        
        except Exception as ex:
            print(ex)
            return {"error": "خطای سرور", "details": str(ex)}


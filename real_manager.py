from services.task_manager import TaskManager
from services.session_manager import SessionManager
import json
from classes.response_handler import ResponseHandler
from config import Config 
from utils import log_task_status


class RealManager:

    @staticmethod
    def send(task,session,captcha): 
        
        try: 
            
            response = TaskManager.generate_travel_data(task, captcha) 
            
            
            if 'error' in response:
                log_task_status(task, "Error", "Failed to generte travel data ", error_details=response)
                return ResponseHandler.error(
                    message="خطا در ارسال باربرگ",
                    details=response["details"],
                    code=1360
                )
                
            data = response['data']
            
            finall_re = session.post(url=Config.REAL_URL, data=data)

            if finall_re.status_code == 200:
                response = json.loads(finall_re.text)
                
                if response['resultCode'] == 200:
                    

                    return ResponseHandler.success(
                        message="باربرگ با موفقیت ارسال شد",
                        result=response,
                        code=200
                    )
                else: 
                    
                    return ResponseHandler.error(
                        message="خطا در ارسال باربرگ",
                        details=response["resultMessage"],
                        code=response['resultCode']
                    )
            else:
                return ResponseHandler.error(
                    message="خطای سرور",
                    details="خطای در سرور رخ داد!",
                    status_code=finall_re.status_code,
                    code=Config.SERVER_ERROR_CODE
                )
        except Exception as ex:
            return ResponseHandler.error(
                message="خطای سرور",
                details=str(ex),
                status_code=finall_re.status_code,
                code=Config.APP_ERROR_CODE
            )


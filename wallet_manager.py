from services.task_manager import TaskManager
import json
import os
from services.session_manager import SessionManager

class WalletManager:
    @staticmethod
    def charge():
        if os.path.exists(TaskManager.TASKS_FILE):
            with open(TaskManager.TASKS_FILE, 'r', encoding='utf-8') as file:
                return json.load(file)
        return {}
    
    
    @staticmethod
    def get_balance(): 
        session_manager = SessionManager.get_instance()
        
        session = session_manager.get_session()
        
        url = 'https://baarbarg.ir/Account/Main.aspx'

        payload = { 
            'function': 'GetValue'
        }

        response = session.post(url, data=payload)

        if response.status_code == 200:
            return  response.json() 
        else:
            return 0
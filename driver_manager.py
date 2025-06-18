from services.session_manager import SessionManager
class DriverManager:

    @staticmethod
    def search(task):
        session_manager = SessionManager.get_instance()
        
        session = session_manager.get_session() 
        
        driver_national_id = task.driver_national_id
        driver_search_url = 'https://baarbarg.ir/Account/FormDocumentDetailsRegister.aspx'

        payload = {
            'txtDriverSearch': driver_national_id,
            'function': 'DriverSearch'
        }

        response = session.post(driver_search_url, data=payload)

        if response.status_code == 200:
            result = response.json()
            if result.get('resultCode') == 200:
                return {
                    'status': True,
                    'data':result.get('obj', {})
                }
            else:
                return {
                    'status': False,
                    'message':result.get('resultMessage', 'Unknown error')
                } 
        else:
            return {
                    'status': False,
                    'message':f"Server error: {response.status_code}"
                }
            
    @staticmethod
    def plaque_search(t1, t2, t3, t4):
        
        session_manager = SessionManager.get_instance()
        
        session = session_manager.get_session() 
        
        plaque_search_url = 'https://baarbarg.ir/Account/FormDocumentDetailsRegister.aspx'

        payload = {
            't1': t1,
            't2': t2,
            't3': t3,
            't4': t4,
            'function': 'PlaqueSearch'
        }

        response = session.post(plaque_search_url, data=payload)

        if response.status_code == 200:
            result = response.json()
            if result.get('resultCode') == 200:
                return {
                    'status': True,
                    'data':result.get('obj', {})
                }
            else:
                return {
                    'status': False,
                    'message':result.get('resultMessage', 'Unknown error')
                } 
        else:
            return {
                    'status': False,
                    'message':f"Server error: {response.status_code}"
                }
    @staticmethod    
    def get_address(lat, lng):
        
        session_manager = SessionManager.get_instance()
        
        session = session_manager.get_session() 
        
        url = 'https://baarbarg.ir/Account/FormDocumentDetailsRegister.aspx'

        payload = {
            'lat': lat,
            'lng': lng,
            'function': 'RevereseMap'
        }
        
        response = session.post(url, data=payload)

        if response.status_code == 200:
            result = response.json()
            if result.get('resultCode') == 200: 
                return result.get('obj', {}).get('address', 'No address found')
            else:
                return f"Error: {result.get('resultMessage', 'Unknown error')}"
        else:
            return f"Server error: {response.status_code}"
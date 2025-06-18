from config import Config


class AuthManager:

    @staticmethod
    def login(session, username, password, captcha): 
        
        login_data = {"txtmobile": username, "txtpassword": password, "captcha": captcha, "function": "login"}
        
        res_loggin = session.post(Config.LOGIN_URL, data=login_data)

        if res_loggin.status_code == 200:
            return True
        else:
            return False

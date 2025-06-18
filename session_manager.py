import requests
from PIL import Image
from io import BytesIO
from services.captcha_solver import CaptchaSolver


class SessionManager:
    _instance = None
    
    def __init__(self):
        if SessionManager._instance is not None:
            raise Exception("Use get_instance() to access SessionManager.")
        self.session = self._create_session()
        self.captcha = self._get_captcha(self.session)
        SessionManager._instance = self
    
    @staticmethod
    def get_instance():
        """Return the singleton instance of SessionManager."""
        if SessionManager._instance is None:
            SessionManager()
        return SessionManager._instance  
        
    def _create_session(self):
        session = requests.session()
        headers = {
            "User-Agent": "Mozilla/5.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        }
        session.headers.update(headers)
        session.get("https://baarbarg.ir")  
        return session

    def _get_captcha(self, session):
        url = "https://baarbarg.ir/Cap.aspx"
        response = session.get(url)
        image = Image.open(BytesIO(response.content))
        
        
        solver = CaptchaSolver()
        return solver.solve(image)

    def get_session(self):
        return self.session

    def get_captcha(self):
        return self.captcha
    
    

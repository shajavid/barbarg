class ResponseHandler:
    def __init__(self, success: bool, message: str, code: int, result: str = None, details: str = None, status_code: int = None):
       
        self.success = success
        self.message = message
        self.code = code
        self.result = result
        self.details = details
        self.status_code = status_code

    @classmethod
    def success(cls, message: str, result: str, code: int):
        """Create a successful response."""
        return cls(success=True, message=message, code=code, result=result)

    @classmethod
    def error(cls, message: str, details: str, code: int, status_code: int = None):
        """Create an error response."""
        return cls(success=False, message=message, code=code, details=details, status_code=status_code)

    def __str__(self):
        """String representation of the response."""
        if self.success:
            return f"Success: {self.message}, Result: {self.result}, Code: {self.code}"
        else:
            return f"Error: {self.message}, Details: {self.details}, Code: {self.code}, Status Code: {self.status_code or 'N/A'}"

from extensions import db
from datetime import datetime


class Bot(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    port = db.Column(db.Integer, nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    tasks = db.relationship('Task', backref='bot', lazy=True)

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    bot_id = db.Column(db.Integer, db.ForeignKey('bot.id'), nullable=False)
    username = db.Column(db.String(50), nullable=False)
    password = db.Column(db.String(50), nullable=False)
    sender_name = db.Column(db.String(100), nullable=True)
    sender_mobile = db.Column(db.String(20), nullable=True)
    sender_phone = db.Column(db.String(20), nullable=True)
    sender_national_id = db.Column(db.String(50), nullable=True)
    sender_postal_code = db.Column(db.String(20), nullable=True)
    receiver_name = db.Column(db.String(100), nullable=True)
    receiver_mobile = db.Column(db.String(20), nullable=True)
    receiver_phone = db.Column(db.String(20), nullable=True)
    receiver_national_id = db.Column(db.String(50), nullable=True)
    driver_national_id = db.Column(db.String(50), nullable=True)
    receiver_postal_code = db.Column(db.String(20), nullable=True)
    iran_code = db.Column(db.String(10), nullable=True)
    pelak = db.Column(db.String(50), nullable=True)
    plate_three_digit = db.Column(db.String(10), nullable=True)
    plate_letter = db.Column(db.String(10), nullable=True)
    plate_two_digit = db.Column(db.String(10), nullable=True)
    amount = db.Column(db.Float, default=0)
    weight = db.Column(db.Float, default=0)
    product_name = db.Column(db.String(100), nullable=True)
    packaging_type = db.Column(db.String(50), nullable=True)
    origin_lat = db.Column(db.Float, nullable=True)
    origin_lon = db.Column(db.Float, nullable=True)
    destination_lat = db.Column(db.Float, nullable=True)
    destination_lon = db.Column(db.Float, nullable=True)
    transfer_username = db.Column(db.String(50), nullable=True)
    transfer_password = db.Column(db.String(50), nullable=True)
    text = db.Column(db.String(255), nullable=True)
    count = db.Column(db.Integer, default=0)
    value = db.Column(db.Float, default=0)
    delay = db.Column(db.Integer, default=0)
    key = db.Column(db.String(50), nullable=True) 
    send_message_to_sender = db.Column(db.Boolean, default=False)
    insurance = db.Column(db.Boolean, default=False)
    wallet_balance = db.Column(db.Float, default=0)
    number_done = db.Column(db.Integer, default=0)
    selected = db.Column(db.Boolean, default=False)
    row_number = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow) 
    
    def to_dict(self):
        return {
            "id": self.id,
            "bot_id": self.bot_id,
            "username": self.username,
            "key": self.key,
            "password": self.password,
            "sender_name": self.sender_name,
            "sender_mobile": self.sender_mobile,
            "sender_phone": self.sender_phone,
            "sender_national_id": self.sender_national_id,
            "sender_postal_code": self.sender_postal_code,
            "receiver_name": self.receiver_name,
            "receiver_mobile": self.receiver_mobile,
            "receiver_phone": self.receiver_phone,
            "receiver_national_id": self.receiver_national_id,
            "driver_national_id": self.driver_national_id,
            "receiver_postal_code": self.receiver_postal_code,
            "iran_code": self.iran_code,
            "pelak": self.pelak,
            "plate_three_digit": self.plate_three_digit,
            "plate_letter": self.plate_letter,
            "plate_two_digit": self.plate_two_digit,
            "amount": self.amount,
            "weight": self.weight,
            "product_name": self.product_name,
            "packaging_type": self.packaging_type,
            "origin_lat": self.origin_lat,
            "origin_lon": self.origin_lon,
            "destination_lat": self.destination_lat,
            "destination_lon": self.destination_lon,
            "transfer_username": self.transfer_username,
            "transfer_password": self.transfer_password,
            "status": self.status,
            "text": self.text,
            "count": self.count,
            "value": self.value,
            "delay": self.delay,
            "send_message_to_sender": self.send_message_to_sender,
            "insurance": self.insurance,
            "wallet_balance": self.wallet_balance,
            "tracking_code": self.tracking_code,
            "registration_status": self.registration_status,
            "number_done": self.number_done,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_request_time": self.last_request_time.isoformat() if self.last_request_time else None,
            "last_registered": self.last_registered.isoformat() if self.last_registered else None
        }
class Leg(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), nullable=True)    
    task_id = db.Column(db.Integer, db.ForeignKey('task.id'), nullable=False)
    leg_number = db.Column(db.Integer, nullable=False)
    row_number = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(500), default="هنوز درخواست ارسال نشده است")
    last_request_time = db.Column(db.DateTime, nullable=True)
    last_registered = db.Column(db.DateTime, nullable=True)
    tracking_code = db.Column(db.String(50), nullable=True)
    number_of_tries = db.Column(db.Integer, default=0)
    registration_status = db.Column(db.Integer, default=0)
    

    # Relationships
    task = db.relationship('Task', backref=db.backref('legs', lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "task_id": self.task_id,
            "leg_number": self.leg_number,
            "status": self.status,
            "last_request_time": self.last_request_time.isoformat() if self.last_request_time else None,
            "last_registered": self.last_registered.isoformat() if self.last_registered else None,
            "tracking_code": self.tracking_code
        }
        
def initialize_database():
    db.create_all()
    
def clear_all_data():
    Task.query.delete()
    Bot.query.delete()
    db.session.commit()

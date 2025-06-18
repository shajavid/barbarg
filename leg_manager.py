import json
import os
import random
from services.driver_manager import DriverManager 
from utils import map_plate_letter, log_task_status
from threading import Lock
from models import db, Bot, Task, Leg
import traceback

task_lock = Lock()


class LegManager:
        
    @staticmethod
    def load_legs():
        try:
            legs = Leg.query.all()  

            legs_data = []
            for leg in legs:
                task = leg.task

                legs_data.append({
                    "id": leg.id,
                    "key" : leg.key,
                    "task_id": leg.task_id,
                    "row_number": task.row_number,
                    "leg_number" : leg.leg_number,
                    "status": leg.status,
                    "last_request_time": leg.last_request_time.isoformat() if leg.last_request_time else None,
                    "last_registered": leg.last_registered.isoformat() if leg.last_registered else None,
                    "tracking_code": leg.tracking_code,
                    "registration_status": leg.registration_status,                    
                    "selected": task.selected,
                    "number_of_tries": leg.number_of_tries,
                    "bot_id": task.bot_id,
                    "username": task.username,
                    "password": task.password,
                    "sender_name": task.sender_name,
                    "sender_mobile": task.sender_mobile,
                    "sender_phone": task.sender_phone,
                    "sender_national_id": task.sender_national_id,
                    "sender_postal_code": task.sender_postal_code,
                    "receiver_name": task.receiver_name,
                    "receiver_mobile": task.receiver_mobile,
                    "receiver_phone": task.receiver_phone,
                    "receiver_national_id": task.receiver_national_id,
                    "driver_national_id": task.driver_national_id,
                    "receiver_postal_code": task.receiver_postal_code,
                    "iran_code": task.iran_code,
                    "pelak": task.pelak,
                    "plate_three_digit": task.plate_three_digit,
                    "plate_letter": task.plate_letter,
                    "plate_two_digit": task.plate_two_digit,
                    "amount": task.amount,
                    "weight": task.weight,
                    "product_name": task.product_name,
                    "packaging_type": task.packaging_type,
                    "origin_lat": task.origin_lat,
                    "origin_lon": task.origin_lon,
                    "destination_lat": task.destination_lat,
                    "destination_lon": task.destination_lon,
                    "transfer_username": task.transfer_username,
                    "transfer_password": task.transfer_password,
                    "text": task.text,
                    "count": task.count,
                    "value": task.value,
                    "delay": task.delay,
                    "send_message_to_sender": task.send_message_to_sender,
                    "insurance": task.insurance,
                    "wallet_balance": task.wallet_balance,
                    "number_done": task.number_done,
                })

            print(f"Loaded {len(legs_data)} legs from the database.")
            return legs_data

        except Exception as ex:
            print(f"load_legs exception: {ex}")
            return []      
 

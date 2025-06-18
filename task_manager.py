import json
import os
import random
from services.driver_manager import DriverManager 
from utils import map_plate_letter, log_task_status
from threading import Lock
from models import db, Bot, Task, Leg
import traceback


task_lock = Lock()


class TaskManager:
    
    
    @staticmethod
    def add_task(bot_name, description):
        bot = Bot.query.filter_by(name=bot_name).first()
        if not bot:
            return {"error": "Bot not found"}

        new_task = Task(bot_id=bot.id, description=description)
        db.session.add(new_task)
        db.session.commit()
        return {"message": "Task added successfully"}
    
    @staticmethod
    def get_tasks(bot_name):
        bot = Bot.query.filter_by(name=bot_name).first()
        if not bot:
            return []
        return [{"id": task.id, "description": task.description, "status": task.status} for task in bot.tasks]

    @staticmethod
    def update_task(task_id, status):
        task = Task.query.get(task_id)
        if not task:
            return {"error": "Task not found"}

        task.status = status
        db.session.commit()
        return {"message": "Task updated successfully"}
    
    
    @staticmethod
    def delete_all():
        Task.query.delete()
        Leg.query.delete()
        db.session.commit()
        
    @staticmethod
    def load_tasks():
        try:
            tasks = Task.query.all()
                
            tasks_data = []
            for task in tasks:
                tasks_data.append({
                        "id": task.id,
                        "bot_id": task.bot_id,
                        "username": task.username,
                        "password": task.password,
                        "sender_name": task.sender_name,
                        "sender_mobile": task.sender_mobile,
                        "sender_phone": task.sender_phone,
                        "sender_national_id": task.sender_national_id,
                        "sender_postal_code": task.sender_postal_code,
                        "selected" : task.selected,
                        "key" : task.key,
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
                        "created_at": task.created_at,
                    })

            print(f"Loaded {len(tasks_data)} tasks from the database.")
            return tasks_data  
                
        except Exception as ex:
            print(f"load_tasks exception: {ex}")
            return []

    @staticmethod
    def save_tasks(tasks):
        try:
            tasks_file = current_config['TASKS_FILE']
            with task_lock:
                with open(tasks_file, 'w', encoding='utf-8') as file:
                    json.dump(tasks, file, indent=4, ensure_ascii=False)
        except Exception:  
            return {}
            
    @staticmethod
    def generate_travel_data(task, captcha_text):
        try:
            
            origin_lat = float(task.origin_lat)
            origin_lon = float(task.origin_lon)
            destination_lat = float(task.destination_lat)
            destination_lon = float(task.destination_lon)

            o_address = DriverManager.get_address(origin_lat, origin_lon)
            d_address = DriverManager.get_address(destination_lat, destination_lon)

            def parse_address(address):
                address_parts = address.split('،')

                address_parts = [part.strip() for part in address_parts]

                country, state, city, district, street = None, None, None, None, None

                if len(address_parts) >= 4:
                    country = address_parts[0]
                    state = address_parts[1]
                    city = address_parts[2]
                    district = address_parts[3]  # Optional
                    street = '، '.join(address_parts[4:]) if len(address_parts) > 4 else None
                elif len(address_parts) == 3:
                    state = address_parts[0]
                    city = address_parts[1]
                    district = address_parts[2]
                elif len(address_parts) == 2:
                    state = address_parts[0]
                    city = address_parts[1]

                return {
                    "country": country,
                    "state": state,
                    "city": city,
                    "district": district,
                    "street": street
                }

            origin_address = parse_address(o_address)
            destination_address = parse_address(d_address)
            
            t1 = int(task.iran_code or 0)
            t2 = int(task.plate_two_digit or 0)
            t3 = int(map_plate_letter(task))
            t4 = int(task.plate_three_digit or 0)
            
            driver_info = DriverManager.search(task)
            
            if driver_info['status'] is False:
                log_task_status(task, "Error", "Failed to send ", error_details=driver_info['message'])
                return {"error": "خطای راننده", "details":driver_info['message'], "code":3901}
            
            driver_info = driver_info['data']
            
            plaque_info = DriverManager.plaque_search(t1, t2, t3, t4)
            if plaque_info['status'] is False:
                log_task_status(task, "Error", "Failed to send ", error_details=plaque_info['message'])
                return {"error": "خطای راننده", "details":plaque_info['message'], "code":3901}
            
            plaque_info = plaque_info['data']
            
            
            IsDraft = "false"
            IT_cost = 0
            RowID = 0
            avarez = 0
            bearingCost = 0
            canIssue = "true"
            date = 0
            LicenseNumber = driver_info["licenseNumber"]
            dateFarsi = 0
            
            destAddress = d_address
            destCityName = destination_address.get("city")
            destPostalCode = ""
            destStateId = destination_address.get("state")
            destStateName = destination_address.get("state")
            
            docNo = 0
            driverCertificateNumber = driver_info["drivingLicenseNumber"]
            driverFirstName = driver_info["firstName"]
            driverFullName = f"{driver_info['firstName']} {driver_info['lastName']}"
            driverHaveCertificate = 0
            driverImage = 0
            driverLastName = ""
            driverMobile = driver_info["mobileNumber"]
            driverNationalCode = task.driver_national_id
            driverRank = ""
            id = 0
            insurance = "false"
            loadDescription = 0
            loadId = 0
            loadName = 0
            loadTypeName = 0
            loadWeight = 0
            notifyCost = ""
            packTypeId = 0
            packTypeName = 0
            postRent = ""
            preRent = ""
            receiverFullName = task.receiver_name
            receiverMobile = task.receiver_mobile
            receiverNationalCode = ""
            receiverPostalCode = ""
            receiverTelNumber = ""
            rent = ""
            rowData = 0
            senderFullName = task.sender_name
            senderMobile = task.sender_mobile
            senderNationalCode = ""
            senderPostalCode = ""
            senderTelNumber = ""
        
            DestinationAddress = d_address
            DestinationCityName = destination_address.get("city")
            mapFlag = "true"
            
            sourceAddress = o_address
            sourceCityId = ""
            sourceCityName = origin_address.get("city")
            sourcePostalCode = ""
            sourceStateId = origin_address.get("state")
            sourceStateName = origin_address.get("state")

            status = 0
            statusName = 0
            submitterId = 0
            
            tag = 0
            time = 0
            toPay = 0
            truckCapacity = plaque_info.get("capacity", "")
            truckId = 0
            truckTagType = "false"
            truckType = plaque_info.get("truckTypeName", "")
            type = 0
            userIdDriver = 0
            value = "12,333"
            zoneCityIds = 0
            zoneStateIds = 0
            stepSource = "Source"
            stepDest = "Dest"
            SendSMS = "false"
            [BoxName,PackTypeId] = task.packaging_type.split("#")
            PackTypeId = int(PackTypeId)
            ProductId = int(task.product_name)
            Wheight = int(task.weight)
            BoxNum = int(task.amount)
            random_id = random.randint(1000, 9999)

            loadList = f'[{{"ID":"{random_id}","ProductId":"{ProductId}","Wheight":"{Wheight}","PackTypeId":"{PackTypeId}","Description":"","BoxNum":"{BoxNum}","Name":"تخمه"}}]'

            lngSource = origin_lon 
            latSource = origin_lat  
            LatDestination = destination_lat  
            LngDestination = destination_lon  
        
            PlaceSource_Name = origin_address.get("district") or origin_address.get("city")
            PlaceSource_StateName = origin_address.get("state")
            PlaceSource_CityName = origin_address.get("city")
            PlaceSource_Address = o_address
            PlaceSource_PostalCode = ""
            PlaceSource_Lat = origin_lat
            PlaceSource_Lon = origin_lon
            PlaceSource_Primary = PlaceSource_Name
            PlaceSource_Poi = ""
            PlaceSource_Country = origin_address.get("country") or "ایران"
            PlaceSource_County = origin_address.get("state")
            PlaceSource_District = origin_address.get("district")
            PlaceSource_Village = ""
            PlaceSource_Region = ""
            PlaceSource_Neighbourhood = ""
            PlaceSource_Last = PlaceSource_Name
            PlaceSource_Plaque = ""
            PlaceSource_Postal_code = ""
            
            PlaceDestination_Name = destination_address.get("district") or destination_address.get("city")
            PlaceDestination_StateName = destination_address.get("state")
            PlaceDestination_CityName = destination_address.get("city")
            PlaceDestination_Address = d_address
            PlaceDestination_PostalCode = ""
            PlaceDestination_Lat = destination_lat
            PlaceDestination_Lon = destination_lon
            PlaceDestination_Primary = PlaceDestination_Name
            PlaceDestination_Poi = ""
            PlaceDestination_Country = destination_address.get("country") or "ایران"
            PlaceDestination_County = destination_address.get("state")
            PlaceDestination_District = destination_address.get("district")
            PlaceDestination_Village = ""
            PlaceDestination_Region = ""
            PlaceDestination_Neighbourhood = ""
            PlaceDestination_Last = PlaceDestination_Name
            PlaceDestination_Plaque = ""
            PlaceDestination_Postal_code = ""

            captcha = captcha_text 

            
            data = {
                "IsDraft": IsDraft,
                "IT_cost": IT_cost,
                "RowID": RowID,
                "avarez": avarez,
                "bearingCost": bearingCost,
                "canIssue": canIssue,
                "date": date,
                "LicenseNumber": LicenseNumber,
                "dateFarsi": dateFarsi,
                "destAddress": destAddress,
                "destCityName": destCityName,
                "destPostalCode": destPostalCode,
                "destStateId": destStateId,
                "destStateName": destStateName,
                "docNo": docNo,
                "driverCertificateNumber": driverCertificateNumber,
                "driverFirstName": driverFirstName,
                "driverFullName": driverFullName,
                "driverHaveCertificate": driverHaveCertificate,
                "driverImage": driverImage,
                "driverLastName": driverLastName,
                "driverMobile": driverMobile,
                "driverNationalCode": driverNationalCode,
                "driverRank": driverRank,
                "id": id,
                "insurance": insurance,
                "loadDescription": loadDescription,
                "loadId": loadId,
                "loadName": loadName,
                "loadTypeName": loadTypeName,
                "loadWeight": loadWeight,
                "notifyCost": notifyCost,
                "packTypeId": packTypeId,
                "packTypeName": packTypeName,
                "postRent": postRent,
                "preRent": preRent,
                "receiverFullName": receiverFullName,
                "receiverMobile": receiverMobile,
                "receiverNationalCode": receiverNationalCode,
                "receiverPostalCode": receiverPostalCode,
                "receiverTelNumber": receiverTelNumber,
                "rent": rent,
                "rowData": rowData,
                "senderFullName": senderFullName,
                "senderMobile": senderMobile,
                "senderNationalCode": senderNationalCode,
                "senderPostalCode": senderPostalCode,
                "senderTelNumber": senderTelNumber,
                "DestinationAddress": DestinationAddress,
                "DestinationCityName": DestinationCityName,
                "mapFlag": mapFlag,
                "sourceAddress": sourceAddress,
                "sourceCityId": sourceCityId,
                "sourceCityName": sourceCityName,
                "sourcePostalCode": sourcePostalCode,
                "sourceStateId": sourceStateId,
                "sourceStateName": sourceStateName,
                "status": status,
                "statusName": statusName,
                "submitterId": submitterId,
                "t1": t1,
                "t2": t2,
                "t3": t3,
                "t4": t4,
                "tag": tag,
                "time": time,
                "toPay": toPay,
                "truckCapacity": truckCapacity,
                "truckId": truckId,
                "truckTagType": truckTagType,
                "truckType": truckType,
                "type": type,
                "userIdDriver": userIdDriver,
                "value": value,
                "zoneCityIds": zoneCityIds,
                "zoneStateIds": zoneStateIds,
                "stepSource": stepSource,
                "stepDest": stepDest,
                "SendSMS": SendSMS,
                "loadList": loadList,
                "lngSource": lngSource,
                "latSource": latSource,
                "LatDestination": LatDestination,
                "LngDestination": LngDestination,
                "PlaceSource[Name]": PlaceSource_Name,
                "PlaceSource[StateName]": PlaceSource_StateName,
                "PlaceSource[CityName]": PlaceSource_CityName,
                "PlaceSource[Address]": PlaceSource_Address,
                "PlaceSource[PostalCode]": PlaceSource_PostalCode,
                "PlaceSource[Lat]": PlaceSource_Lat,
                "PlaceSource[Lon]": PlaceSource_Lon,
                "PlaceSource[Primary]": PlaceSource_Primary,
                "PlaceSource[Poi]": PlaceSource_Poi,
                "PlaceSource[Country]": PlaceSource_Country,
                "PlaceSource[County]": PlaceSource_County,
                "PlaceSource[District]": PlaceSource_District,
                "PlaceSource[Village]": PlaceSource_Village,
                "PlaceSource[Region]": PlaceSource_Region,
                "PlaceSource[Neighbourhood]": PlaceSource_Neighbourhood,
                "PlaceSource[Last]": PlaceSource_Last,
                "PlaceSource[Plaque]": PlaceSource_Plaque,
                "PlaceSource[Postal_code]": PlaceSource_Postal_code,
                "PlaceDestination[Name]": PlaceDestination_Name,
                "PlaceDestination[StateName]": PlaceDestination_StateName,
                "PlaceDestination[CityName]": PlaceDestination_CityName,
                "PlaceDestination[Address]": PlaceDestination_Address,
                "PlaceDestination[PostalCode]": PlaceDestination_PostalCode,
                "PlaceDestination[Lat]": PlaceDestination_Lat,
                "PlaceDestination[Lon]": PlaceDestination_Lon,
                "PlaceDestination[Primary]": PlaceDestination_Primary,
                "PlaceDestination[Poi]": PlaceDestination_Poi,
                "PlaceDestination[Country]": PlaceDestination_Country,
                "PlaceDestination[County]": PlaceDestination_County,
                "PlaceDestination[District]": PlaceDestination_District,
                "PlaceDestination[Village]": PlaceDestination_Village,
                "PlaceDestination[Region]": PlaceDestination_Region,
                "PlaceDestination[Neighbourhood]": PlaceDestination_Neighbourhood,
                "PlaceDestination[Last]": PlaceDestination_Last,
                "PlaceDestination[Plaque]": PlaceDestination_Plaque,
                "PlaceDestination[Postal_code]": PlaceDestination_Postal_code,
                "freighterId": "",
                "captcha": captcha,
                "function": "UpdateRegister"
            }

            return {"success": "با موفقیت انجام شد.", "data":data}
        except Exception as ex:
            tb = traceback.format_exc()
            return {"error": "خطا در یافت اطلاعات", "details":str(ex), "code":3901,"traceback": tb}
        
            
 

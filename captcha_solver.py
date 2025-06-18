import numpy as np
from PIL import Image
import torch
from torchvision import transforms
import torch.nn as nn
from torch.nn.functional import relu
import os


class CaptchaSolver:
    def __init__(self):
        base_path = os.path.dirname(os.path.abspath(__file__))   
        self.keras_model_path = os.path.join(base_path, '../data/Captcha_time_baby.keras')
        self.pytorch_model_path = os.path.join(base_path, '../data/Captcha(Best).pt')
        
        self.sizes = [
            [15, -5, 15, 27],
            [15, -5, 28, 40],
            [15, -5, 41, 53],
            [15, -5, 53, 65],
            [15, -5, 66, 78]
        ]
        try:
            from keras.models import load_model
            self.model_type = 'keras'
            self.model = load_model(self.keras_model_path)
        except:
            self.model_type = 'pytorch'
            self.device = "cpu" 
            self.model = self.ModelWithAttention(10).to(self.device)
            self.model.load_state_dict(torch.load(self.pytorch_model_path, map_location=torch.device("cpu")))
            self.model.eval()

            # Define transform for image processing (for PyTorch)
            self.transform = transforms.Compose([
                transforms.ToTensor(),
                transforms.Grayscale(),
                transforms.Resize((64, 64))
            ])

    class GlobalAttention(nn.Module):
        def __init__(self, num_channels):
            super().__init__()
            self.attention = nn.Sequential(
                nn.Conv2d(num_channels, 1, kernel_size=1),
                nn.BatchNorm2d(1),
                nn.Sigmoid()
            )

        def forward(self, x):
            attention_weights = self.attention(x)
            return x * attention_weights

    class ModelWithAttention(nn.Module):
        def __init__(self, num_characters):
            super().__init__()
            self.conv1 = nn.Conv2d(1, 64, kernel_size=(3, 3), padding='same')
            self.bn1 = nn.BatchNorm2d(64)
            self.pool = nn.MaxPool2d(kernel_size=(2, 2))

            self.conv2 = nn.Conv2d(64, 128, kernel_size=(3, 3), padding='same')
            self.bn2 = nn.BatchNorm2d(128)

            self.conv3 = nn.Conv2d(128, 256, kernel_size=(3, 3), padding='same')
            self.bn3 = nn.BatchNorm2d(256)

            self.conv4 = nn.Conv2d(256, 512, kernel_size=(3, 3), padding='same')
            self.bn4 = nn.BatchNorm2d(512)
            self.pool2 = nn.MaxPool2d(kernel_size=(1, 2))

            self.attention = CaptchaSolver.GlobalAttention(512)
            
            self.flatten = nn.Flatten()
            self.fc1 = nn.Linear(16384, 512)
            self.bn5 = nn.BatchNorm1d(512)
            self.dropout1 = nn.Dropout(0.5)

            self.fc2 = nn.Linear(512, 512)
            self.bn6 = nn.BatchNorm1d(512)
            self.dropout2 = nn.Dropout(0.75)

            self.output = nn.Linear(512, num_characters)
            self.sm = nn.Softmax()

        def forward(self, x):
            x = self.pool(relu(self.bn1(self.conv1(x))))
            x = self.pool(relu(self.bn2(self.conv2(x))))
            x = self.pool(relu(self.bn3(self.conv3(x))))
            x = self.pool2(relu(self.bn4(self.conv4(x))))

            x = self.flatten(x)
            x = relu(self.bn5(self.fc1(x)))
            x = self.dropout1(x)

            x = relu(self.bn6(self.fc2(x)))
            x = self.dropout2(x)

            x = self.output(x)
            x = self.sm(x)
            return x

    def solve(self, img) -> str:
        """Solve the captcha using the loaded model."""
        if self.model_type == 'keras':
            return self._solve_with_keras(img)
        else:
            return self._solve_with_pytorch(img)

    def _solve_with_keras(self, img) -> str:
        """Solve captcha using Keras model."""
        answer = ""
        imgss = np.array(img)
        for size in self.sizes:
            img = imgss[size[0]:size[1], size[2]:size[3]]
            img = Image.fromarray(img)
            img = img.resize((64, 64))
            img = np.array(img)
            img = img / 255
            img = np.expand_dims(img, axis=0)
            pre = self.model.predict(img, verbose=False)
            pre = np.argmax(pre)
            answer += str(pre)
        return answer

    # def _solve_with_pytorch(self, imgs: np.array) -> str:
    #     """Solve captcha using PyTorch model."""
    #     answer = ""
    #     self.model.eval()
    #     for size in self.sizes:
    #         img = imgs[size[0]:size[1], size[2]:size[3]]
    #         img = Image.fromarray(img)
    #         img = self.transform(img)
    #         img = img.unsqueeze(0)
    #         answer += str(torch.argmax(self.model(img.to(self.device))).cpu().numpy())
    #     return answer
    
    def _solve_with_pytorch(self, imgs: np.array) -> str:
        """Solve captcha using PyTorch model."""
        answer = ""
        self.model.eval()

        # اگر تصویر به صورت GIF است، آن را به RGB و سپس به numpy تبدیل کنید
        if isinstance(imgs, Image.Image):
            if imgs.format == 'GIF':
                imgs.seek(0)  # انتخاب اولین فریم
            imgs = imgs.convert('RGB')  # تبدیل به RGB
            imgs = np.array(imgs)  # تبدیل به آرایه numpy

        # پردازش و استخراج قسمت‌های مورد نظر از تصویر
        for size in self.sizes:
            img = imgs[size[0]:size[1], size[2]:size[3]]
            img = Image.fromarray(img)
            img = self.transform(img)
            img = img.unsqueeze(0)  # اضافه کردن بعد برای استفاده در مدل

            # پیش‌بینی و به‌دست‌آوردن جواب
            answer += str(torch.argmax(self.model(img.to(self.device))).cpu().numpy())

        return answer

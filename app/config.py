import os

class Config:
    BASEDIR = os.path.abspath(os.path.dirname(__file__))
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', '').replace('postgres://', 'postgresql://') or f"sqlite:///{os.path.join(BASEDIR, 'app.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = True
    SECRET_KEY = os.getenv('SECRET_KEY', 'default-secret-key')

    # Email configuration (par défaut Gmail)
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() in ['true', '1', 'yes']
    MAIL_USE_SSL = os.getenv('MAIL_USE_SSL', 'False').lower() in ['true', '1', 'yes']
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER')

    # Mapping pour différents fournisseurs de messagerie
    MAIL_CONFIGS = {
        'gmail': {
            'server': 'smtp.gmail.com',
            'port': 587,
            'use_tls': True,
            'use_ssl': False,
        },
        'yahoo': {
            'server': 'smtp.mail.yahoo.com',
            'port': 465,
            'use_tls': False,
            'use_ssl': True,
        },
        'outlook': {
            'server': 'smtp.office365.com',
            'port': 587,
            'use_tls': True,
            'use_ssl': False,
        },
    }

    @staticmethod
    def get_mail_config(email):
        domain = email.split('@')[-1]  # Extraire le domaine (exemple: gmail.com)
        if 'gmail.com' in domain:
            return Config.MAIL_CONFIGS['gmail']
        elif 'yahoo.com' in domain:
            return Config.MAIL_CONFIGS['yahoo']
        elif 'outlook.com' in domain or 'hotmail.com' in domain:
            return Config.MAIL_CONFIGS['outlook']
        else:
            raise ValueError(f"Fournisseur de messagerie non pris en charge : {domain}")
        
print(f"MAIL_SERVER: {Config.MAIL_SERVER}")
print(f"MAIL_PORT: {Config.MAIL_PORT}")
print(f"MAIL_USE_TLS: {Config.MAIL_USE_TLS}")
print(f"MAIL_USERNAME: {Config.MAIL_USERNAME}")
print(f"MAIL_PASSWORD: {'***' if Config.MAIL_PASSWORD else None}")
print(f"MAIL_DEFAULT_SENDER: {Config.MAIL_DEFAULT_SENDER}")

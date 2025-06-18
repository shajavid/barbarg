from celery import Celery


def make_celery(app):
    celery = Celery(
        app.import_name,
        broker=app.config['CELERY_BROKER_URL'],
        backend=app.config['CELERY_RESULT_BACKEND'],
        broker_pool_limit=10,
        broker_heartbeat=10,
        broker_connection_timeout=30 
    ) 

    class ContextTask(celery.Task):

        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery

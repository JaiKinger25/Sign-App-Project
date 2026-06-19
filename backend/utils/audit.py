from models import AuditLog

def add_audit(db, action, user_id=None, doc_id=None, ip_address=None, details=None):
    log = AuditLog(action=action, user_id=user_id, doc_id=doc_id, ip_address=ip_address, details=details)
    db.add(log)
    db.commit()

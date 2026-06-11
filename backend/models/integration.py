# models/integration.py

from sqlalchemy import Column,Integer,String,ForeignKey
from db.database import Base

class Integration(Base):
    __tablename__ = "integrations"

    id = Column(Integer, primary_key=True)
    organization_id = Column(Integer)
    provider = Column(String)
    status = Column(String)

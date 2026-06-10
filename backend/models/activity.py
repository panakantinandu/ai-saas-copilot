from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import ForeignKey
from sqlalchemy import DateTime

from db.database import Base

class Activity(Base):

    __tablename__ = "activities"

    id = Column(Integer, primary_key=True)

    organization_id = Column(Integer)

    provider = Column(String)

    user_email = Column(String)

    activity_type = Column(String)

    activity_timestamp = Column(DateTime)
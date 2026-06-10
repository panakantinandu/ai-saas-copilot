
from sqlalchemy import Column, DateTime, Integer, String

from db.database import Base


class Commit(Base):

    __tablename__ = "commits"

    id = Column(Integer, primary_key=True)

    sha = Column(String, unique=True)

    repository_name = Column(String)

    author = Column(String)

    commit_date = Column(DateTime)
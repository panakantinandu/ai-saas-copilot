from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Boolean

from db.database import Base

class Repository(Base):

    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True)

    github_repo_id = Column(Integer, unique=True)

    name = Column(String)

    full_name = Column(String)

    private = Column(Boolean)

    owner = Column(String)

    default_branch = Column(String)
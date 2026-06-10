from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import DateTime
from sqlalchemy.sql import func

from db.database import Base


class AIRecommendation(Base):

    __tablename__ = "ai_recommendations"

    id = Column(Integer, primary_key=True)

    repository_name = Column(String)

    recommendation = Column(Text)

    business_impact = Column(Text)

    security_risk = Column(Text)

    suggested_action = Column(Text)

    generated_at = Column(
        DateTime,
        server_default=func.now()
    )
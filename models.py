from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

    repositories = relationship("Repository", back_populates="owner")


class Repository(Base):
    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, index=True)
    name = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="repositories")
    analyses = relationship("Analysis", back_populates="repository")


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    security_score = Column(Float)
    quality_score = Column(Float)
    maintainability_score = Column(Float)
    overview = Column(Text)

    repository = relationship("Repository", back_populates="analyses")
    issues = relationship("Issue", back_populates="analysis")


class Issue(Base):
    __tablename__ = "issues"

    id = Column(String, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"))
    file_path = Column(String)
    issue_type = Column(String) # security, bug, performance, practice
    severity = Column(String) # Critical, High, Medium, Low
    title = Column(String)
    description = Column(Text)
    suggested_fix = Column(Text)

    analysis = relationship("Analysis", back_populates="issues")

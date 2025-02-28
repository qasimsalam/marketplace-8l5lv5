import uuid
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from sqlalchemy import Column, String, Text, Numeric, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB, UUID
from pydantic import BaseModel, field_validator, model_validator

from ..config import settings


class JobType(str, Enum):
    """Enumeration of possible job payment types"""
    FIXED_PRICE = "FIXED_PRICE"
    HOURLY = "HOURLY"
    MILESTONE_BASED = "MILESTONE_BASED"


class JobStatus(str, Enum):
    """Enumeration of possible job statuses throughout its lifecycle"""
    DRAFT = "DRAFT"
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    ON_HOLD = "ON_HOLD"


class JobDifficulty(str, Enum):
    """Enumeration of possible job difficulty levels for AI projects"""
    BEGINNER = "BEGINNER"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"
    EXPERT = "EXPERT"


class Job(Base):
    """SQLAlchemy model representing a job posting in the AI Talent Marketplace"""
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    poster_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    poster_company_id = Column(String(255), nullable=True, index=True)
    
    type = Column(String(50), nullable=False, index=True)
    status = Column(String(50), nullable=False, default=JobStatus.DRAFT.value, index=True)
    
    # Budget fields
    budget = Column(Numeric(10, 2), nullable=True)  # For FIXED_PRICE
    min_budget = Column(Numeric(10, 2), nullable=True)  # For MILESTONE_BASED
    max_budget = Column(Numeric(10, 2), nullable=True)  # For MILESTONE_BASED
    hourly_rate = Column(Numeric(10, 2), nullable=True)  # For HOURLY
    
    # Duration fields
    estimated_duration = Column(Integer, nullable=True)  # Days
    estimated_hours = Column(Integer, nullable=True)  # Hours for HOURLY jobs
    
    # Job specifics
    difficulty = Column(String(50), nullable=True, index=True)
    location = Column(String(255), nullable=True, index=True)
    is_remote = Column(Boolean, default=True)
    
    # Skills and attachments
    required_skills = Column(JSONB, default=list)
    preferred_skills = Column(JSONB, default=list)
    attachments = Column(JSONB, default=list)
    
    # Categorization
    category = Column(String(100), nullable=True, index=True)
    subcategory = Column(String(100), nullable=True, index=True)
    
    # Dates
    expires_at = Column(DateTime, nullable=True, index=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    
    # Contract and assignment
    contract_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    freelancer_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True, index=True)
    
    # Relationships
    proposals = relationship("Proposal", back_populates="job", cascade="all, delete-orphan")
    
    def __init__(
        self,
        title: str,
        description: str,
        poster_id: uuid.UUID,
        type: JobType,
        poster_company_id: Optional[str] = None,
        budget: Optional[float] = None,
        min_budget: Optional[float] = None,
        max_budget: Optional[float] = None,
        hourly_rate: Optional[float] = None,
        estimated_duration: Optional[int] = None,
        estimated_hours: Optional[int] = None,
        difficulty: Optional[JobDifficulty] = None,
        location: Optional[str] = None,
        is_remote: Optional[bool] = True,
        required_skills: Optional[List[Dict]] = None,
        preferred_skills: Optional[List[Dict]] = None,
        attachments: Optional[List] = None,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        expires_at: Optional[datetime] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ):
        """Initialize a Job instance with the provided attributes"""
        self.id = uuid.uuid4()
        self.title = title
        self.description = description
        self.poster_id = poster_id
        self.poster_company_id = poster_company_id
        self.type = type.value if isinstance(type, JobType) else type
        self.status = JobStatus.DRAFT.value
        
        self.budget = budget
        self.min_budget = min_budget
        self.max_budget = max_budget
        self.hourly_rate = hourly_rate
        self.estimated_duration = estimated_duration
        self.estimated_hours = estimated_hours
        
        self.difficulty = difficulty.value if isinstance(difficulty, JobDifficulty) else difficulty
        self.location = location
        self.is_remote = is_remote
        
        self.required_skills = required_skills or []
        self.preferred_skills = preferred_skills or []
        self.attachments = attachments or []
        
        self.category = category
        self.subcategory = subcategory
        
        self.expires_at = expires_at
        self.start_date = start_date
        self.end_date = end_date
        
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.deleted_at = None

    def to_dict(self) -> Dict:
        """Convert the job model to a dictionary representation"""
        return {
            'id': str(self.id),
            'title': self.title,
            'description': self.description,
            'poster_id': str(self.poster_id),
            'poster_company_id': self.poster_company_id,
            'type': self.type,
            'status': self.status,
            'budget': float(self.budget) if self.budget is not None else None,
            'min_budget': float(self.min_budget) if self.min_budget is not None else None,
            'max_budget': float(self.max_budget) if self.max_budget is not None else None,
            'hourly_rate': float(self.hourly_rate) if self.hourly_rate is not None else None,
            'estimated_duration': self.estimated_duration,
            'estimated_hours': self.estimated_hours,
            'difficulty': self.difficulty,
            'location': self.location,
            'is_remote': self.is_remote,
            'required_skills': self.required_skills,
            'preferred_skills': self.preferred_skills,
            'attachments': self.attachments,
            'category': self.category,
            'subcategory': self.subcategory,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'contract_id': str(self.contract_id) if self.contract_id else None,
            'freelancer_id': str(self.freelancer_id) if self.freelancer_id else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None
        }

    def update(self, data: Dict) -> 'Job':
        """Update job attributes with new values"""
        for key, value in data.items():
            if hasattr(self, key):
                setattr(self, key, value)
                
        self.updated_at = datetime.utcnow()
        return self

    def change_status(self, new_status: JobStatus) -> bool:
        """Update the job status with validation"""
        # Status transitions validation logic
        valid_transitions = {
            JobStatus.DRAFT.value: [JobStatus.OPEN.value, JobStatus.CANCELLED.value],
            JobStatus.OPEN.value: [JobStatus.IN_PROGRESS.value, JobStatus.CANCELLED.value, JobStatus.ON_HOLD.value],
            JobStatus.IN_PROGRESS.value: [JobStatus.COMPLETED.value, JobStatus.CANCELLED.value, JobStatus.ON_HOLD.value],
            JobStatus.ON_HOLD.value: [JobStatus.IN_PROGRESS.value, JobStatus.CANCELLED.value],
            JobStatus.COMPLETED.value: [],  # Terminal state
            JobStatus.CANCELLED.value: []   # Terminal state
        }
        
        new_status_value = new_status.value if isinstance(new_status, JobStatus) else new_status
        
        if new_status_value in valid_transitions.get(self.status, []):
            self.status = new_status_value
            self.updated_at = datetime.utcnow()
            return True
        
        return False

    def is_editable(self) -> bool:
        """Check if job is in an editable state"""
        editable_statuses = [JobStatus.DRAFT.value, JobStatus.OPEN.value]
        return self.status in editable_statuses and self.deleted_at is None

    def assign_freelancer(self, freelancer_id: uuid.UUID, contract_id: Optional[uuid.UUID] = None) -> bool:
        """Assign a freelancer to this job and update status"""
        if self.status == JobStatus.OPEN.value:
            self.freelancer_id = freelancer_id
            if contract_id:
                self.contract_id = contract_id
            
            # Change status to IN_PROGRESS
            result = self.change_status(JobStatus.IN_PROGRESS)
            self.updated_at = datetime.utcnow()
            return result
        
        return False

    def complete_job(self) -> bool:
        """Mark the job as completed"""
        if self.status == JobStatus.IN_PROGRESS.value:
            result = self.change_status(JobStatus.COMPLETED)
            self.updated_at = datetime.utcnow()
            return result
        
        return False

    def cancel_job(self) -> bool:
        """Cancel the job"""
        if self.status != JobStatus.COMPLETED.value:
            result = self.change_status(JobStatus.CANCELLED)
            self.updated_at = datetime.utcnow()
            return result
        
        return False

    def is_expired(self) -> bool:
        """Check if the job has expired"""
        if self.expires_at and self.status == JobStatus.OPEN.value:
            return datetime.utcnow() > self.expires_at
        
        return False

    def soft_delete(self) -> None:
        """Soft delete the job by setting deleted_at timestamp"""
        self.deleted_at = datetime.utcnow()
        if self.status != JobStatus.CANCELLED.value:
            self.status = JobStatus.CANCELLED.value
        
        self.updated_at = datetime.utcnow()

    def to_search_document(self) -> Dict:
        """Convert job to format suitable for search indexing"""
        # Get basic job data
        job_dict = self.to_dict()
        
        # Add special fields for search
        search_doc = {
            **job_dict,
            "full_text": f"{self.title} {self.description}",
            "skill_keywords": [skill.get('name', '') for skill in self.required_skills + self.preferred_skills],
            "match_score": 0,  # Will be populated during search
            "index_name": settings.ELASTICSEARCH_JOB_INDEX  # Add index name for reference
        }
        
        return search_doc

    @staticmethod
    def from_dto(job_dto: Dict, poster_id: uuid.UUID) -> 'Job':
        """Create a Job instance from a DTO (static method)"""
        # Extract and map fields from DTO to model
        job_type = JobType(job_dto.get('type'))
        difficulty = JobDifficulty(job_dto.get('difficulty')) if job_dto.get('difficulty') else None
        
        # Create job instance
        job = Job(
            title=job_dto.get('title'),
            description=job_dto.get('description'),
            poster_id=poster_id,
            type=job_type,
            poster_company_id=job_dto.get('poster_company_id'),
            budget=job_dto.get('budget'),
            min_budget=job_dto.get('min_budget'),
            max_budget=job_dto.get('max_budget'),
            hourly_rate=job_dto.get('hourly_rate'),
            estimated_duration=job_dto.get('estimated_duration'),
            estimated_hours=job_dto.get('estimated_hours'),
            difficulty=difficulty,
            location=job_dto.get('location'),
            is_remote=job_dto.get('is_remote', True),
            required_skills=job_dto.get('required_skills', []),
            preferred_skills=job_dto.get('preferred_skills', []),
            attachments=job_dto.get('attachments', []),
            category=job_dto.get('category'),
            subcategory=job_dto.get('subcategory'),
            expires_at=job_dto.get('expires_at'),
            start_date=job_dto.get('start_date'),
            end_date=job_dto.get('end_date')
        )
        
        return job

    def validate_budget_fields(self) -> bool:
        """Validate budget fields based on job type"""
        if self.type == JobType.FIXED_PRICE.value:
            return self.budget is not None and float(self.budget) > 0
        
        elif self.type == JobType.HOURLY.value:
            return (self.hourly_rate is not None and float(self.hourly_rate) > 0 and 
                    self.estimated_hours is not None and self.estimated_hours > 0)
        
        elif self.type == JobType.MILESTONE_BASED.value:
            return (self.min_budget is not None and float(self.min_budget) > 0 and
                    self.max_budget is not None and float(self.max_budget) >= float(self.min_budget))
        
        return False


class JobSchema(BaseModel):
    """Pydantic schema for Job model validation and serialization"""
    id: uuid.UUID
    title: str
    description: str
    poster_id: uuid.UUID
    poster_company_id: Optional[str] = None
    type: JobType
    status: JobStatus
    budget: Optional[float] = None
    min_budget: Optional[float] = None
    max_budget: Optional[float] = None
    hourly_rate: Optional[float] = None
    estimated_duration: Optional[int] = None
    estimated_hours: Optional[int] = None
    difficulty: Optional[JobDifficulty] = None
    location: Optional[str] = None
    is_remote: Optional[bool] = True
    required_skills: List[Dict] = []
    preferred_skills: List[Dict] = []
    attachments: List[str] = []
    category: Optional[str] = None
    subcategory: Optional[str] = None
    expires_at: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    contract_id: Optional[uuid.UUID] = None
    freelancer_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    
    class Config:
        """Pydantic configuration class"""
        orm_mode = True
        allow_population_by_field_name = True


class JobCreateSchema(BaseModel):
    """Pydantic schema for creating a new job"""
    title: str
    description: str
    type: JobType
    budget: Optional[float] = None
    min_budget: Optional[float] = None
    max_budget: Optional[float] = None
    hourly_rate: Optional[float] = None
    estimated_duration: Optional[int] = None
    estimated_hours: Optional[int] = None
    difficulty: Optional[JobDifficulty] = None
    location: Optional[str] = None
    is_remote: Optional[bool] = True
    required_skills: List[Dict]
    preferred_skills: Optional[List[Dict]] = []
    attachments: Optional[List[str]] = []
    category: Optional[str] = None
    subcategory: Optional[str] = None
    expires_at: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    @field_validator('title')
    def validate_title(cls, title):
        """Validate job title length"""
        if len(title) < 5 or len(title) > 100:
            raise ValueError('Title must be between 5 and 100 characters')
        return title
    
    @field_validator('description')
    def validate_description(cls, description):
        """Validate job description length"""
        if len(description) < 100:
            raise ValueError('Description must be at least 100 characters')
        return description
    
    @model_validator(mode='after')
    def validate_budget_fields(self):
        """Validate budget fields based on job type"""
        if self.type == JobType.FIXED_PRICE:
            if not self.budget or self.budget <= 0:
                raise ValueError('Fixed price jobs must specify a budget greater than 0')
                
        elif self.type == JobType.HOURLY:
            if not self.hourly_rate or self.hourly_rate <= 0:
                raise ValueError('Hourly jobs must specify an hourly rate greater than 0')
                
            if not self.estimated_hours or self.estimated_hours <= 0:
                raise ValueError('Hourly jobs must specify estimated hours greater than 0')
                
        elif self.type == JobType.MILESTONE_BASED:
            if not self.min_budget or self.min_budget <= 0:
                raise ValueError('Milestone-based jobs must specify a minimum budget greater than 0')
                
            if not self.max_budget or self.max_budget < self.min_budget:
                raise ValueError('Maximum budget must be greater than or equal to minimum budget')
        
        return self
    
    @field_validator('required_skills')
    def validate_skills(cls, skills):
        """Validate required skills format"""
        if not skills:
            raise ValueError('At least one required skill must be specified')
            
        for skill in skills:
            if not isinstance(skill, dict) or not all(k in skill for k in ('id', 'name', 'level')):
                raise ValueError('Each skill must have id, name, and level')
                
        return skills
    
    @model_validator(mode='after')
    def validate_dates(self):
        """Validate job dates are logical"""
        now = datetime.utcnow()
        
        if self.start_date and self.start_date < now:
            raise ValueError('Start date must be in the future')
            
        if self.start_date and self.end_date and self.end_date <= self.start_date:
            raise ValueError('End date must be after start date')
            
        if self.expires_at and self.expires_at < now:
            raise ValueError('Expiration date must be in the future')
            
        return self
    
    class Config:
        """Pydantic configuration class"""
        json_schema_extra = {
            'example': {
                'title': 'AI Model Development Project',
                'description': 'We need an expert in machine learning to develop a computer vision model for product recognition...',
                'type': 'FIXED_PRICE',
                'budget': 5000.00,
                'difficulty': 'ADVANCED',
                'is_remote': True,
                'required_skills': [{'id': '1', 'name': 'TensorFlow', 'level': 'Expert'}, {'id': '2', 'name': 'Computer Vision', 'level': 'Advanced'}],
                'preferred_skills': [{'id': '3', 'name': 'PyTorch', 'level': 'Intermediate'}],
                'category': 'Machine Learning',
                'subcategory': 'Computer Vision',
                'expires_at': '2023-12-31T23:59:59Z'
            }
        }


class JobUpdateSchema(BaseModel):
    """Pydantic schema for updating an existing job"""
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[JobType] = None
    budget: Optional[float] = None
    min_budget: Optional[float] = None
    max_budget: Optional[float] = None
    hourly_rate: Optional[float] = None
    estimated_duration: Optional[int] = None
    estimated_hours: Optional[int] = None
    difficulty: Optional[JobDifficulty] = None
    location: Optional[str] = None
    is_remote: Optional[bool] = None
    required_skills: Optional[List[Dict]] = None
    preferred_skills: Optional[List[Dict]] = None
    attachments: Optional[List[str]] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    expires_at: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    @field_validator('title')
    def validate_title(cls, title):
        """Validate job title length if provided"""
        if title is None:
            return title
            
        if len(title) < 5 or len(title) > 100:
            raise ValueError('Title must be between 5 and 100 characters')
            
        return title
    
    @field_validator('description')
    def validate_description(cls, description):
        """Validate job description length if provided"""
        if description is None:
            return description
            
        if len(description) < 100:
            raise ValueError('Description must be at least 100 characters')
            
        return description
    
    @model_validator(mode='after')
    def validate_budget_fields(self):
        """Validate budget fields based on job type if provided"""
        # Skip validation if type is not provided
        if self.type is None:
            return self
            
        if self.type == JobType.FIXED_PRICE:
            if self.budget is not None and self.budget <= 0:
                raise ValueError('Fixed price jobs must specify a budget greater than 0')
                
        elif self.type == JobType.HOURLY:
            if self.hourly_rate is not None and self.hourly_rate <= 0:
                raise ValueError('Hourly jobs must specify an hourly rate greater than 0')
                
            if self.estimated_hours is not None and self.estimated_hours <= 0:
                raise ValueError('Hourly jobs must specify estimated hours greater than 0')
                
        elif self.type == JobType.MILESTONE_BASED:
            if self.min_budget is not None and self.min_budget <= 0:
                raise ValueError('Milestone-based jobs must specify a minimum budget greater than 0')
                
            if self.max_budget is not None and self.min_budget is not None and self.max_budget < self.min_budget:
                raise ValueError('Maximum budget must be greater than or equal to minimum budget')
                
        return self
    
    @model_validator(mode='after')
    def validate_dates(self):
        """Validate job dates are logical if provided"""
        now = datetime.utcnow()
        
        if self.start_date and self.start_date < now:
            raise ValueError('Start date must be in the future')
            
        if self.start_date and self.end_date and self.end_date <= self.start_date:
            raise ValueError('End date must be after start date')
            
        if self.expires_at and self.expires_at < now:
            raise ValueError('Expiration date must be in the future')
            
        return self
    
    class Config:
        """Pydantic configuration class"""
        json_schema_extra = {
            'example': {
                'title': 'Updated AI Model Development Project',
                'budget': 6000.00,
                'required_skills': [{'id': '1', 'name': 'TensorFlow', 'level': 'Expert'}, {'id': '2', 'name': 'Computer Vision', 'level': 'Expert'}],
                'expires_at': '2024-01-31T23:59:59Z'
            }
        }
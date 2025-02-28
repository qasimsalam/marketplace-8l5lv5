import uuid
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional

from sqlalchemy import Column, String, Text, Numeric, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB, UUID
from pydantic import BaseModel, field_validator, model_validator

from ..config import settings
from .job import Base, Job


class ProposalStatus(str, Enum):
    """Enumeration of possible proposal statuses throughout its lifecycle"""
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"


class ProposalMilestone(Base):
    """SQLAlchemy model representing a milestone within a proposal"""
    __tablename__ = "proposal_milestones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id"))
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    due_date = Column(DateTime, nullable=False)
    order = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationship
    proposal = relationship("Proposal", back_populates="milestones")

    def __init__(
        self,
        title: str,
        description: str,
        amount: float,
        due_date: datetime,
        order: int,
        proposal_id: uuid.UUID = None,
    ):
        """Initialize a ProposalMilestone instance with the provided attributes"""
        self.id = uuid.uuid4()
        self.proposal_id = proposal_id
        self.title = title
        self.description = description
        self.amount = amount
        self.due_date = due_date
        self.order = order
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def to_dict(self) -> Dict:
        """Convert the milestone model to a dictionary representation"""
        return {
            'id': str(self.id),
            'proposal_id': str(self.proposal_id) if self.proposal_id else None,
            'title': self.title,
            'description': self.description,
            'amount': float(self.amount) if self.amount is not None else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'order': self.order,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class Proposal(Base):
    """SQLAlchemy model representing a proposal from a freelancer for a specific job"""
    __tablename__ = "proposals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    freelancer_id = Column(UUID(as_uuid=True), nullable=False)
    
    cover_letter = Column(Text, nullable=False)
    proposed_rate = Column(Numeric(10, 2), nullable=True)
    proposed_budget = Column(Numeric(12, 2), nullable=True)
    estimated_duration = Column(Integer, nullable=True)  # Days
    estimated_hours = Column(Integer, nullable=True)  # Hours for HOURLY jobs
    
    attachments = Column(JSONB, nullable=False, default=list)
    status = Column(String, nullable=False, default=ProposalStatus.PENDING.value)
    relevance_score = Column(Numeric(5, 2), nullable=True)  # AI-calculated score
    rejection_reason = Column(Text, nullable=True)
    
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    job = relationship("Job", back_populates="proposals")
    milestones = relationship("ProposalMilestone", back_populates="proposal", cascade="all, delete-orphan")

    def __init__(
        self,
        job_id: uuid.UUID,
        freelancer_id: uuid.UUID,
        cover_letter: str,
        proposed_rate: Optional[float] = None,
        proposed_budget: Optional[float] = None,
        estimated_duration: Optional[int] = None,
        estimated_hours: Optional[int] = None,
        attachments: Optional[List[Dict]] = None,
        milestones: Optional[List[Dict]] = None,
    ):
        """Initialize a Proposal instance with the provided attributes"""
        self.id = uuid.uuid4()
        self.job_id = job_id
        self.freelancer_id = freelancer_id
        self.cover_letter = cover_letter
        self.proposed_rate = proposed_rate
        self.proposed_budget = proposed_budget
        self.estimated_duration = estimated_duration
        self.estimated_hours = estimated_hours
        self.attachments = attachments or []
        self.status = ProposalStatus.PENDING.value
        
        # Set expiration date based on configuration
        self.expires_at = datetime.utcnow() + timedelta(days=settings.PROPOSAL_EXPIRY_DAYS)
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        
        # Create milestone objects if provided
        if milestones:
            self.milestones = [
                ProposalMilestone(
                    title=m.get('title'),
                    description=m.get('description'),
                    amount=m.get('amount'),
                    due_date=m.get('due_date'),
                    order=m.get('order', i),
                    proposal_id=self.id
                )
                for i, m in enumerate(milestones)
            ]

    def to_dict(self) -> Dict:
        """Convert the proposal model to a dictionary representation"""
        result = {
            'id': str(self.id),
            'job_id': str(self.job_id),
            'freelancer_id': str(self.freelancer_id),
            'cover_letter': self.cover_letter,
            'proposed_rate': float(self.proposed_rate) if self.proposed_rate is not None else None,
            'proposed_budget': float(self.proposed_budget) if self.proposed_budget is not None else None,
            'estimated_duration': self.estimated_duration,
            'estimated_hours': self.estimated_hours,
            'attachments': self.attachments,
            'status': self.status,
            'relevance_score': float(self.relevance_score) if self.relevance_score is not None else None,
            'rejection_reason': self.rejection_reason,
            'expires_at': self.expires_at.isoformat(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
        
        # Add milestones if they exist
        if hasattr(self, 'milestones') and self.milestones:
            result['milestones'] = [milestone.to_dict() for milestone in self.milestones]
            
        return result

    def update(self, data: Dict) -> 'Proposal':
        """Update proposal attributes with new values"""
        for key, value in data.items():
            if key == 'milestones':
                # Handle milestones separately
                if value:
                    # Clear existing milestones and add new ones
                    self.milestones = []
                    for i, m in enumerate(value):
                        milestone = ProposalMilestone(
                            title=m.get('title'),
                            description=m.get('description'),
                            amount=m.get('amount'),
                            due_date=m.get('due_date'),
                            order=m.get('order', i),
                            proposal_id=self.id
                        )
                        self.milestones.append(milestone)
            elif hasattr(self, key):
                setattr(self, key, value)
                
        self.updated_at = datetime.utcnow()
        return self

    def change_status(self, new_status: ProposalStatus, reason: Optional[str] = None) -> bool:
        """Update the proposal status with validation"""
        # Status transitions validation logic
        valid_transitions = {
            ProposalStatus.PENDING.value: [
                ProposalStatus.UNDER_REVIEW.value, 
                ProposalStatus.REJECTED.value, 
                ProposalStatus.WITHDRAWN.value
            ],
            ProposalStatus.UNDER_REVIEW.value: [
                ProposalStatus.ACCEPTED.value, 
                ProposalStatus.REJECTED.value, 
                ProposalStatus.WITHDRAWN.value
            ],
            ProposalStatus.ACCEPTED.value: [
                ProposalStatus.WITHDRAWN.value
            ],
            ProposalStatus.REJECTED.value: [],  # Terminal state
            ProposalStatus.WITHDRAWN.value: []   # Terminal state
        }
        
        new_status_value = new_status.value if isinstance(new_status, ProposalStatus) else new_status
        
        if new_status_value in valid_transitions.get(self.status, []):
            self.status = new_status_value
            
            # Set rejection reason if applicable
            if new_status_value == ProposalStatus.REJECTED.value and reason:
                self.rejection_reason = reason
                
            self.updated_at = datetime.utcnow()
            return True
        
        return False

    def is_editable(self) -> bool:
        """Check if proposal is in an editable state"""
        return self.status == ProposalStatus.PENDING.value and not self.is_expired()

    def is_expired(self) -> bool:
        """Check if the proposal has expired"""
        return datetime.utcnow() > self.expires_at

    @staticmethod
    def from_dto(proposal_dto: Dict, freelancer_id: uuid.UUID) -> 'Proposal':
        """Create a Proposal instance from a DTO (static method)"""
        # Extract and validate required fields from DTO
        job_id = proposal_dto.get('job_id')
        cover_letter = proposal_dto.get('cover_letter')
        proposed_rate = proposal_dto.get('proposed_rate')
        proposed_budget = proposal_dto.get('proposed_budget')
        estimated_duration = proposal_dto.get('estimated_duration')
        estimated_hours = proposal_dto.get('estimated_hours')
        attachments = proposal_dto.get('attachments', [])
        milestones = proposal_dto.get('milestones', [])
        
        # Create new proposal instance
        proposal = Proposal(
            job_id=job_id,
            freelancer_id=freelancer_id,
            cover_letter=cover_letter,
            proposed_rate=proposed_rate,
            proposed_budget=proposed_budget,
            estimated_duration=estimated_duration,
            estimated_hours=estimated_hours,
            attachments=attachments,
            milestones=milestones
        )
        
        return proposal


# Pydantic schemas for validation and serialization

class ProposalMilestoneSchema(BaseModel):
    """Pydantic schema for ProposalMilestone model validation and serialization"""
    id: uuid.UUID
    proposal_id: uuid.UUID
    title: str
    description: str
    amount: float
    due_date: datetime
    order: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        """Pydantic configuration class"""
        orm_mode = True
        allow_population_by_field_name = True


class ProposalSchema(BaseModel):
    """Pydantic schema for Proposal model validation and serialization"""
    id: uuid.UUID
    job_id: uuid.UUID
    freelancer_id: uuid.UUID
    cover_letter: str
    proposed_rate: Optional[float] = None
    proposed_budget: Optional[float] = None
    estimated_duration: Optional[int] = None
    estimated_hours: Optional[int] = None
    attachments: List[Dict] = []
    status: ProposalStatus
    relevance_score: Optional[float] = None
    rejection_reason: Optional[str] = None
    expires_at: datetime
    milestones: List[ProposalMilestoneSchema] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        """Pydantic configuration class"""
        orm_mode = True
        allow_population_by_field_name = True


class ProposalMilestoneCreateSchema(BaseModel):
    """Pydantic schema for creating a new proposal milestone"""
    title: str
    description: str
    amount: float
    due_date: datetime
    order: int
    
    @field_validator('title')
    def validate_title(cls, title):
        """Validate milestone title length"""
        if len(title) < 3 or len(title) > 100:
            raise ValueError('Title must be between 3 and 100 characters')
        return title
    
    @field_validator('amount')
    def validate_amount(cls, amount):
        """Validate milestone amount is positive"""
        if amount <= 0:
            raise ValueError('Amount must be greater than 0')
        return amount
    
    @field_validator('due_date')
    def validate_due_date(cls, due_date):
        """Validate milestone due date is in the future"""
        if due_date <= datetime.utcnow():
            raise ValueError('Due date must be in the future')
        return due_date


class ProposalCreateSchema(BaseModel):
    """Pydantic schema for creating a new proposal"""
    job_id: uuid.UUID
    cover_letter: str
    proposed_rate: Optional[float] = None
    proposed_budget: Optional[float] = None
    estimated_duration: Optional[int] = None
    estimated_hours: Optional[int] = None
    attachments: Optional[List[Dict]] = None
    milestones: Optional[List[ProposalMilestoneCreateSchema]] = None
    
    @field_validator('cover_letter')
    def validate_cover_letter(cls, cover_letter):
        """Validate cover letter length"""
        if len(cover_letter) < 100:
            raise ValueError('Cover letter must be at least 100 characters')
        return cover_letter
    
    @model_validator(mode='after')
    def validate_budget_fields(cls, values):
        """Validate budget fields are properly provided"""
        # At least one of proposed_rate or proposed_budget must be provided
        if not values.proposed_rate and not values.proposed_budget:
            raise ValueError('Either proposed_rate or proposed_budget must be provided')
        
        # If proposed_rate is provided, estimated_hours must also be provided
        if values.proposed_rate is not None and values.estimated_hours is None:
            raise ValueError('Estimated hours must be provided for hourly rate proposals')
        
        # Budget values must be positive
        if values.proposed_rate is not None and values.proposed_rate <= 0:
            raise ValueError('Proposed rate must be greater than 0')
            
        if values.proposed_budget is not None and values.proposed_budget <= 0:
            raise ValueError('Proposed budget must be greater than 0')
            
        return values
    
    @model_validator(mode='after')
    def validate_milestones(cls, values):
        """Validate milestones if provided"""
        # Skip if milestones not provided or budget not milestone-based
        if not values.milestones or not values.proposed_budget:
            return values
            
        # Total milestone amount should match the proposed budget
        total_milestone_amount = sum(m.amount for m in values.milestones)
        if not abs(total_milestone_amount - values.proposed_budget) < 0.01:  # Allow for small float differences
            raise ValueError('Total milestone amounts must match the proposed budget')
            
        # Check for sequential order values
        orders = sorted(m.order for m in values.milestones)
        expected_orders = list(range(1, len(values.milestones) + 1))
        if orders != expected_orders:
            raise ValueError('Milestone orders must be sequential starting from 1')
            
        return values
    
    class Config:
        """Pydantic configuration class"""
        json_schema_extra = {
            'example': {
                'job_id': '123e4567-e89b-12d3-a456-426614174000',
                'cover_letter': 'I am an experienced AI engineer with expertise in computer vision and deep learning. I have worked on similar projects in the past...',
                'proposed_budget': 5000.0,
                'estimated_duration': 30,
                'attachments': [{'name': 'portfolio.pdf', 'url': 'https://example.com/files/portfolio.pdf'}],
                'milestones': [
                    {'title': 'Initial Research', 'description': 'Research and planning phase', 'amount': 1000.0, 'due_date': '2023-10-15T00:00:00Z', 'order': 1},
                    {'title': 'Model Development', 'description': 'Building and training the model', 'amount': 3000.0, 'due_date': '2023-11-15T00:00:00Z', 'order': 2},
                    {'title': 'Testing and Deployment', 'description': 'Final testing and deployment', 'amount': 1000.0, 'due_date': '2023-12-15T00:00:00Z', 'order': 3}
                ]
            }
        }


class ProposalUpdateSchema(BaseModel):
    """Pydantic schema for updating an existing proposal"""
    cover_letter: Optional[str] = None
    proposed_rate: Optional[float] = None
    proposed_budget: Optional[float] = None
    estimated_duration: Optional[int] = None
    estimated_hours: Optional[int] = None
    attachments: Optional[List[Dict]] = None
    milestones: Optional[List[ProposalMilestoneCreateSchema]] = None
    
    @field_validator('cover_letter')
    def validate_cover_letter(cls, cover_letter):
        """Validate cover letter length if provided"""
        if cover_letter is None:
            return cover_letter
            
        if len(cover_letter) < 100:
            raise ValueError('Cover letter must be at least 100 characters')
            
        return cover_letter
    
    @model_validator(mode='after')
    def validate_budget_fields(cls, values):
        """Validate budget fields if provided"""
        # Skip validation if no budget fields provided
        if all(field is None for field in [
            values.proposed_rate, 
            values.proposed_budget,
            values.estimated_hours
        ]):
            return values
            
        # If proposed_rate is provided, estimated_hours must also be provided
        if (values.proposed_rate is not None and values.proposed_rate > 0 and 
            values.estimated_hours is None):
            raise ValueError('Estimated hours must be provided for hourly rate proposals')
            
        # Budget values must be positive if provided
        if values.proposed_rate is not None and values.proposed_rate <= 0:
            raise ValueError('Proposed rate must be greater than 0')
            
        if values.proposed_budget is not None and values.proposed_budget <= 0:
            raise ValueError('Proposed budget must be greater than 0')
            
        return values
    
    class Config:
        """Pydantic configuration class"""
        json_schema_extra = {
            'example': {
                'cover_letter': 'Updated cover letter with additional information about my qualifications...',
                'proposed_budget': 5500.0,
                'milestones': [
                    {'title': 'Initial Research', 'description': 'Updated research scope', 'amount': 1500.0, 'due_date': '2023-10-20T00:00:00Z', 'order': 1},
                    {'title': 'Model Development', 'description': 'Building and training the model', 'amount': 3000.0, 'due_date': '2023-11-20T00:00:00Z', 'order': 2},
                    {'title': 'Testing and Deployment', 'description': 'Final testing and deployment', 'amount': 1000.0, 'due_date': '2023-12-20T00:00:00Z', 'order': 3}
                ]
            }
        }


class ProposalStatusUpdateSchema(BaseModel):
    """Pydantic schema for updating a proposal's status"""
    status: ProposalStatus
    reason: Optional[str] = None
    
    @model_validator(mode='after')
    def validate_reason(cls, values):
        """Validate rejection reason if status is REJECTED"""
        if values.status == ProposalStatus.REJECTED and not values.reason:
            raise ValueError('Reason is required when rejecting a proposal')
        return values
    
    class Config:
        """Pydantic configuration class"""
        json_schema_extra = {
            'example': {
                'status': 'ACCEPTED',
                'reason': None
            }
        }
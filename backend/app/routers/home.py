import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.home import HomeCommandCenterResponse
from app.services.home import get_home_command_center_service

router = APIRouter(
    prefix="/companies/{company_id}/home",
    tags=["Home Command Center"],
)


@router.get(
    "",
    response_model=HomeCommandCenterResponse,
    status_code=status.HTTP_200_OK,
    summary="Get aggregated Home / My Work Command Center state for the authenticated user",
)
def get_home_command_center(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_home_command_center_service(
        db=db,
        company_id=company_id,
        current_user=current_user,
    )

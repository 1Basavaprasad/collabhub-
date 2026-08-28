import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.notification import (
    InvitationActionResponse,
    UserInvitationResponse,
)
from app.services.company_invitation import (
    accept_in_app_invitation_service,
    decline_in_app_invitation_service,
    get_my_pending_invitations_service,
)

user_invitations_router = APIRouter(
    tags=["Invitations"],
)


@user_invitations_router.get(
    "/users/me/invitations",
    response_model=list[UserInvitationResponse],
    status_code=status.HTTP_200_OK,
    summary="List all pending workspace invitations for current authenticated user",
)
def get_my_pending_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_my_pending_invitations_service(
        db=db,
        user_email=current_user.email,
    )


@user_invitations_router.post(
    "/invitations/{invitation_id}/accept",
    response_model=InvitationActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Accept a workspace invitation directly in-app",
)
def accept_invitation_in_app(
    invitation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return accept_in_app_invitation_service(
        db=db,
        invitation_id=invitation_id,
        user_id=current_user.id,
        user_email=current_user.email,
    )


@user_invitations_router.post(
    "/invitations/{invitation_id}/decline",
    response_model=InvitationActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Decline a workspace invitation directly in-app",
)
def decline_invitation_in_app(
    invitation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return decline_in_app_invitation_service(
        db=db,
        invitation_id=invitation_id,
        user_email=current_user.email,
    )

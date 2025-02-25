"""Add is_hunted column to user_bounty_status

Revision ID: 8043220bf200
Revises: 02a49a8548fd
Create Date: 2025-01-14 19:50:05.856755

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8043220bf200'
down_revision = '02a49a8548fd'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('user_bounty_status', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_hunted', sa.Boolean(), nullable=True))

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('user_bounty_status', schema=None) as batch_op:
        batch_op.drop_column('is_hunted')

    # ### end Alembic commands ###

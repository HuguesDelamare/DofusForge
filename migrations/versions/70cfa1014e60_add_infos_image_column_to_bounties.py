"""Add infos_image column to bounties

Revision ID: 70cfa1014e60
Revises: 8043220bf200
Create Date: 2025-01-14 20:22:37.746662

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '70cfa1014e60'
down_revision = '8043220bf200'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('bounties', schema=None) as batch_op:
        batch_op.add_column(sa.Column('infos_image', sa.String(length=512), nullable=True))

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('bounties', schema=None) as batch_op:
        batch_op.drop_column('infos_image')

    # ### end Alembic commands ###

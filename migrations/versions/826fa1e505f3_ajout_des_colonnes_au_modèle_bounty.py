"""Ajout des colonnes au modèle Bounty

Revision ID: 826fa1e505f3
Revises: 02b0873cff69
Create Date: 2025-01-14 15:28:38.508264

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '826fa1e505f3'
down_revision = '02b0873cff69'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('bounties', schema=None) as batch_op:
        batch_op.add_column(sa.Column('image_url', sa.String(length=512), nullable=True))
        batch_op.add_column(sa.Column('reward_amount', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('reward_type', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('location_image', sa.String(length=512), nullable=True))
        batch_op.add_column(sa.Column('location_map_name', sa.String(length=255), nullable=True))
        batch_op.alter_column('difficulty',
               existing_type=sa.VARCHAR(length=50),
               type_=sa.Integer(),
               existing_nullable=True,
               postgresql_using='difficulty::integer')
        batch_op.alter_column('server_id',
               existing_type=sa.INTEGER(),
               nullable=True)
        batch_op.drop_column('icon')
        batch_op.drop_column('map')
        batch_op.drop_column('last_killed_at')
        batch_op.drop_column('reward')
        batch_op.drop_column('description')
        batch_op.drop_column('spot')

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('bounties', schema=None) as batch_op:
        batch_op.add_column(sa.Column('spot', sa.VARCHAR(length=255), nullable=True))
        batch_op.add_column(sa.Column('description', sa.TEXT(), nullable=True))
        batch_op.add_column(sa.Column('reward', sa.VARCHAR(length=255), nullable=True))
        batch_op.add_column(sa.Column('last_killed_at', sa.DATETIME(), nullable=True))
        batch_op.add_column(sa.Column('map', sa.VARCHAR(length=255), nullable=True))
        batch_op.add_column(sa.Column('icon', sa.VARCHAR(length=512), nullable=True))
        batch_op.alter_column('server_id',
               existing_type=sa.INTEGER(),
               nullable=False)
        batch_op.alter_column('difficulty',
               existing_type=sa.Integer(),
               type_=sa.VARCHAR(length=50),
               existing_nullable=True)
        batch_op.drop_column('location_map_name')
        batch_op.drop_column('location_image')
        batch_op.drop_column('reward_type')
        batch_op.drop_column('reward_amount')
        batch_op.drop_column('image_url')

    # ### end Alembic commands ###

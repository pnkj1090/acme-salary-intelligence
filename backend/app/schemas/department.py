from pydantic import BaseModel, ConfigDict


class DepartmentBase(BaseModel):
    code: str
    name: str


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentRead(DepartmentBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

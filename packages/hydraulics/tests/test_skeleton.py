from network_hydraulic.models.fluid import Fluid


def test_fluid_defaults() -> None:
    fluid = Fluid(
        name=None,
        phase="gas",
        density=1.2,
        molecular_weight=18.0,
        z_factor=1.0,
        specific_heat_ratio=1.4,
        viscosity=1.8e-5,
        standard_flow_rate=None,
    )
    assert fluid.phase == "gas"

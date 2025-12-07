import pint

# --- Setup ---
# 1. Initialize the Unit Registry
u = pint.UnitRegistry()

# 2. Define Standard Atmospheric Pressure.
# This will be the offset for our gauge units.
P_atm = 1.0 * u.atm
# We can see its value in our base units (pascal, psi, bar)
P_atm_pascal = P_atm.to(u.pascal).magnitude
P_atm_psi = P_atm.to(u.psi).magnitude
P_atm_bar = P_atm.to(u.bar).magnitude

# Access the standard gravity constant

# ksc
# ureg.define(f"ksc = {P_ksc_Pa} * pascal; offset: 0")
u.define("ksc = kilogram_force / centimeter**2")

# You can also add aliases
P_atm_ksc = P_atm.to(u.ksc).magnitude

# 3. Define the new gauge pressure units
# The format is: "new_unit = scaling_factor * absolute_unit; offset: offset_value"
# This means: P_abs = P_gauge * scaling_factor + offset_value
# Here, the scaling factor is 1 for all of them.

# Pascal (gauge)
# P_abs (Pa) = P_gauge (PaG) + 101325
u.define(f"pascal_gauge = 1 * pascal; offset: {P_atm_pascal}")
u.define("@alias pascal_gauge = PaG") # Add a short alias
u.define("@alias pascal_gauge = Pag")

# PSI (gauge)
# P_abs (psi) = P_gauge (psig) + 14.6959...
u.define(f"psi_gauge = 1 * psi; offset: {P_atm_psi}")
u.define("@alias psi_gauge = psig")

# Bar (gauge)
# P_abs (bar) = P_gauge (barg) + 1.01325
u.define(f"bar_gauge = 1 * bar; offset: {P_atm_bar}")
u.define("@alias bar_gauge = barg")

# kPa (gauge)
# P_abs (kPa) = P_gauge (kPa) + 101.325
u.define(f"kPa_gauge = 1 * kilopascal; offset: {P_atm_pascal / 1000}")
u.define("@alias kPa_gauge = kPag")

# This tells pint: "ksc_gauge has the same scale as ksc,
# but it's offset by 1 standard atmosphere."
u.define(f"ksc_gauge = 1 * ksc; offset: {P_atm_ksc}")

# You can also add an alias with 'g'
u.define("@alias ksc_gauge = kscg")
# ----------------------------------------------------------------------
# kg/cm² (absolute) – very widely used in Asia, Latin America, and older European documentation
# ----------------------------------------------------------------------
u.define("kg_cm2 = kilogram_force / centimeter**2")           # same physical unit as ksc

# kg/cm² gauge – the gauge variant you actually need in daily work
u.define("kg_cm2g = 1 * ksc; offset: 1.033227452799886")    # exactly 1 atm in kg/cm²
u.define("@alias kg_cm2g = kg/cm²g = kg/cm2g = kgf/cm²g = kgf/cm2g = atg")

# Optional short forms that many engineers type
u.define("@alias kg_cm2  = kgcm2 = kgfcm2 = kgf_cm2")
u.define("@alias kg_cm2g = kgcm2g = kgfcm2g = kgf_cm2g")

# Conventional water column units (ρ_water = 1000 kg/m³, g = 9.80665 m/s²)
u.define("mmH2O = 9.80665 pascal = mmH₂O = mmH2O_g = mmWG = mmwg = millimeter_water")
u.define("cmH2O = 10 * mmH2O = cmH₂O = cmH2O_g = cmWG = cmwg = centimeter_water")

def u_convert_float(value: float, from_unit: str, to_unit: str) -> float:
    """
    Convert a float value from one unit to another.
    Returns the original value if units are invalid or dimensions mismatch.
    """
    try:
        # 1. Try to create the original quantity
        original_quantity = u.Quantity(value, from_unit)
    except pint.errors.UndefinedUnitError:
        # 'from_unit' is invalid, return original float value
        return value

    try:
        # 2. Try to convert to the new unit
        return original_quantity.to(to_unit).magnitude
    except (pint.errors.UndefinedUnitError, pint.errors.DimensionalityError):
        # 'to_unit' is invalid or dimensions mismatch
        # As requested, return the original float value
        return value

def u_convert_str(value: float, from_unit: str, to_unit: str) -> str:
    """
    Convert a string value from one unit to another.
    
    - If 'from_unit' is invalid, returns str(value).
    - If 'to_unit' is invalid or dimensions mismatch, returns the 
      string of the *original* quantity (e.g., "10.0 meter").
    """
    try:
        original_quantity = u.Quantity(value, from_unit)
    except pint.errors.UndefinedUnitError:
        # 'from_unit' is invalid, return original value as string
        return str(value)

    try:
        converted_quantity = original_quantity.to(to_unit)
        return str(converted_quantity)
    except (pint.errors.UndefinedUnitError, pint.errors.DimensionalityError):
        # 'to_unit' is invalid, return original quantity as string
        return str(original_quantity)

def u_convert_quantity(value: float, from_unit: str, to_unit: str) -> pint.Quantity:
    """
    Convert a pint.Quantity value from one unit to another.

    - If 'from_unit' is invalid, returns a *dimensionless* quantity of the value.
    - If 'to_unit' is invalid or dimensions mismatch, returns the 
      *original* quantity (e.g., 10.0 <Unit('meter')>).
    """
    try:
        original_quantity = u.Quantity(value, from_unit)
    except pint.errors.UndefinedUnitError:
        # 'from_unit' is invalid. Return original value as a 
        # dimensionless quantity to respect the return type.
        return u.Quantity(value)

    try:
        converted_quantity = original_quantity.to(to_unit)
        return converted_quantity
    except (pint.errors.UndefinedUnitError, pint.errors.DimensionalityError):
        # 'to_unit' is invalid or dims mismatch.
        # Return the original, valid quantity.
        return original_quantity
    

# --- Examples ---
if __name__ == "__main__":
    print("--- Registry and Offset Definitions ---")
    print(f"Standard Atmosphere (psi): {P_atm_psi:.5f} psi")
    print(f"Standard Atmosphere (bar): {P_atm_bar:.5f} bar")
    print("-" * 40)


    print("\n--- Gauge to Absolute Conversions ---")
    # 1. Start with 0 gauge pressure (atmospheric pressure)
    pressure_g_1 = u.Quantity(0, u.psig)
    print(f"{pressure_g_1} = {pressure_g_1.to(u.psi):.5f} (absolute)")

    pressure_g_2 = u.Quantity(0, u.barg)
    print(f"{pressure_g_2} = {pressure_g_2.to(u.bar):.5f} (absolute)")

    # 2. Start with a positive gauge pressure
    pressure_g_3 = u.Quantity(10, u.barg)
    print(f"{pressure_g_3} = {pressure_g_3.to(u.bar):.5f} (absolute)")
    print(f"{pressure_g_3} = {pressure_g_3.to(u.psi):.5f} (absolute)")
    print(f"{pressure_g_3} = {pressure_g_3.to(u.psig):.5f} (gauge)")
    print(f"{pressure_g_3} = {pressure_g_3.to(u.kscg):.5f} (gauge)")
    print(f"{pressure_g_3} = {pressure_g_3.to(u.kg_cm2g):.5f} (gauge)")
    print("-" * 40)


    print("\n--- Absolute to Gauge Conversions ---")
    # 1. Start with standard atmospheric pressure (should be 0 gauge)
    pressure_a_1 = 1.0 * u.atm
    print(f"{pressure_a_1.to(u.psi):.5f} (absolute) = {pressure_a_1.to(u.psig):.5f}")

    # 2. Start with a high absolute pressure
    pressure_a_2 = 30 * u.psi
    print(f"{pressure_a_2} (absolute) = {pressure_a_2.to(u.psig):.5f}")
    print(f"{pressure_a_2} (absolute) = {pressure_a_2.to(u.kscg):.5f}")
    print("-" * 40)

    print("\n--- Delta (Difference) Calculations ---")
    # Pint correctly handles differences (offsets cancel out)
    pressure_delta = u.Quantity(10, u.psig) - u.Quantity(5, u.psig)
    print(f"A difference of {pressure_delta}...")
    print(f"...is equal to {pressure_delta.to(u.psi)}")
    print("Note: 5.0 psig = 5.0 psi (because it's a difference)")
    print("-" * 40)
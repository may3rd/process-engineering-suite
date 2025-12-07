"""Command-line entry point with run helpers and backward compatibility.

Example:

    # new preferred form
    network-hydraulic run config/sample_network.yaml --output results/out.yaml

    # legacy compatible form
    network-hydraulic config/sample_network.yaml -o results/out.yaml
"""
from __future__ import annotations

import logging
from pathlib import Path
import sys

import typer

from network_hydraulic.io import results as results_io
from network_hydraulic.io.loader import ConfigurationLoader
from network_hydraulic.solver.network_solver import NetworkSolver
from network_hydraulic.solver.network_system_solver import NetworkSystemSolver
from network_hydraulic.optimizer.system_optimizer import NetworkSystemOptimizer
from network_hydraulic.utils.logging_config import configure_logging

app = typer.Typer(help="Hydraulic calculation framework")
logger = logging.getLogger(__name__)


def _execute_run(
    *,
    config: Path,
    output: Path | None,
    debug_fittings: bool,
) -> None:
    configure_logging()
    logger.info("Starting network-hydraulic run for config '%s'", config)

    try:
        loader = _load_configuration(config)
        if loader.has_network_collection:
            system = loader.build_network_system()
            logger.info(
                "Loaded %d network(s) from '%s'",
                len(system.bundles),
                config,
            )
            optimizer = NetworkSystemOptimizer(system.optimizer_settings)
            optimizer.run(system)
            solver_settings = system.solver_settings
            solver_kwargs = {}
            if solver_settings.max_iterations is not None:
                solver_kwargs["max_iterations"] = solver_settings.max_iterations
            if solver_settings.tolerance is not None:
                solver_kwargs["tolerance"] = solver_settings.tolerance
            if solver_settings.relaxation is not None:
                solver_kwargs["relaxation"] = solver_settings.relaxation
            solver = NetworkSystemSolver(**solver_kwargs)
            system_result = solver.run(system)
            results_io.print_system_summary(system, system_result, debug=debug_fittings)
            if output:
                results_io.write_system_output(output, system_result)
            for bundle in system_result.bundles:
                logger.info("Completed solver run for network '%s'", bundle.network.name)
            return

        network = loader.build_network()
        logger.info("Loaded network '%s' with %d section(s)", network.name, len(network.sections))

        solver = NetworkSolver()
        result = solver.run(network)
    except ValueError as exc:
        typer.secho(f"Configuration error: {exc}", fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc
    except NotImplementedError as exc:  # pragma: no cover - placeholder
        typer.secho(str(exc), fg=typer.colors.RED)
        raise typer.Exit(code=1) from exc
    else:
        results_io.print_summary(network, result, debug=debug_fittings)
        if output:
            results_io.write_output(output, network, result)
    logger.info("Completed run for network '%s'", network.name)


def _load_configuration(config: Path) -> ConfigurationLoader:
    extension = config.suffix.lower()
    if extension in {".yaml", ".yml"}:
        return ConfigurationLoader.from_yaml_path(config)
    if extension == ".json":
        return ConfigurationLoader.from_json_path(config)
    if extension == ".xml":
        return ConfigurationLoader.from_xml_path(config)
    return ConfigurationLoader.from_yaml_path(config)


@app.command()
def run(
    config: Path = typer.Argument(..., help="Path to the YAML/JSON/XML network configuration."),
    output: Path | None = typer.Option(
        None,
        "--output",
        "-o",
        help="Optional path to write the calculation results (YAML unless suffix is .json).",
    ),
    debug_fittings: bool = typer.Option(
        False,
        "--debug-fittings",
        help="Print per-fitting K-factor breakdowns in the CLI summary.",
    ),
) -> None:
    """Run a network calculation from a YAML/JSON/XML config file."""
    _execute_run(
        config=config,
        output=output,
        debug_fittings=debug_fittings,
    )


@app.callback(invoke_without_command=True)
def main_command(
    ctx: typer.Context,
    output: Path | None = typer.Option(
        None,
        "--output",
        "-o",
        help="Optional path to write the calculation results (YAML unless suffix is .json).",
    ),
    default_diameter: float | None = typer.Option(
        None,
        "--default-diameter",
        "-d",
        help="Fallback pipe diameter in meters when a section omits pipe_diameter.",
    ),
    flow_rate: float | None = typer.Option(
        None,
        "--flow-rate",
        "-f",
        help="Override volumetric flow rate (m^3/s) passed to calculators.",
    ),
    debug_fittings: bool = typer.Option(
        False,
        "--debug-fittings",
        help="Print per-fitting K-factor breakdowns in the CLI summary.",
    ),
) -> None:
    """Allow backward-compatible invocation without the 'run' subcommand."""
    if ctx.invoked_subcommand:
        return
    # If no subcommand is invoked, and no config is provided via the main app arguments
    # (which is now handled by the `run` command after `sys.argv` manipulation),
    # then print help.
    typer.echo(ctx.get_help())
    raise typer.Exit(code=0)


def main() -> None:
    # Backward compatibility: allow `network-hydraulic config.yaml` by inserting the
    # `run` subcommand when the first argument looks like a file path.
    if len(sys.argv) > 1:
        first = sys.argv[1]
        if (
            first not in { "run", "--help", "-h", "--version", "-V" }
            and not first.startswith("-")
        ):
            sys.argv.insert(1, "run")
    app()


if __name__ == "__main__":
    main()

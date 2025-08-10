from bokeh.plotting import figure, curdoc
from bokeh.models import ColumnDataSource, Slider
from bokeh.layouts import column, row
import numpy as np

# Function to project 401k and Roth IRA growth
def project_balances(_401k_contribution, roth_contribution, employer_match, salary, tax_now, tax_retirement, growth_rate, years):
    # Annual contribution limits (2024 values)
    roth_limit = 7500  # Roth IRA limit
    _401k_limit = 23000  # 401(k) contribution limit
    employer_match_dollars = (employer_match / 100) * salary  # Employer match contribution
    
    # Adjust contributions based on limits
    roth_contribution = min(roth_contribution, roth_limit)  # Max Roth IRA contribution
    _401k_contribution = min(_401k_contribution, _401k_limit)  # Max 401(k) contribution
    
    # After-tax contribution for Roth (pay tax now)
    roth_net = roth_contribution
    
    # Before-tax contribution for 401k (pre-tax contributions)
    _401k_net = _401k_contribution + employer_match_dollars
    
    # Initialize balance tracking
    years_array = np.arange(1, years + 1)
    roth_balance = np.zeros(years)
    _401k_balance = np.zeros(years)
    
    for i in range(years):
        # Apply compound interest
        if i == 0:
            roth_balance[i] = roth_net
            _401k_balance[i] = _401k_net
        else:
            roth_balance[i] = roth_balance[i-1] * (1 + growth_rate/100) + roth_net
            _401k_balance[i] = _401k_balance[i-1] * (1 + growth_rate/100) + _401k_net
            
    # 401(k) Post-tax withdrawal (Tax applied at retirement)
    _401k_balance_after_tax = _401k_balance * (1 - tax_retirement / 100)
    
    return years_array, roth_balance, _401k_balance_after_tax

# Bokeh Data Source
source = ColumnDataSource(data=dict(years=[], roth=[], _401k=[]))

# Create figure
p = figure(title="401(k) vs. Roth IRA Growth", x_axis_label="Years", y_axis_label="Balance ($)", 
           height=400, width=700)
p.line('years', 'roth', source=source, color="blue", legend_label="Roth IRA", line_width=3)
p.line('years', '_401k', source=source, color="green", legend_label="401(k)", line_width=3)

# Sliders for input parameters
sliders = {
    "_401k_contribution": Slider(title="Annual 401(k) Contribution ($)", value=10000, start=1000, end=23000, step=500),
    "roth_contribution": Slider(title="Annual Roth IRA Contribution ($)", value=6000, start=1000, end=7500, step=500),
    "employer_match": Slider(title="Employer Match (%)", value=4, start=0, end=10, step=1),
    "salary": Slider(title="Annual Salary ($)", value=100000, start=20000, end=300000, step=5000),
    "tax_now": Slider(title="Tax Rate Now (%)", value=24, start=10, end=50, step=1),
    "tax_retirement": Slider(title="Tax Rate in Retirement (%)", value=15, start=10, end=50, step=1),
    "growth_rate": Slider(title="Annual Growth Rate (%)", value=7, start=3, end=12, step=0.5),
    "years": Slider(title="Number of Years", value=30, start=10, end=50, step=1),
}

# Callback function to update graph dynamically
def update(attr, old, new):
    years, roth, _401k = project_balances(
        sliders["_401k_contribution"].value,
        sliders["roth_contribution"].value,
        sliders["employer_match"].value,
        sliders["salary"].value,
        sliders["tax_now"].value,
        sliders["tax_retirement"].value,
        sliders["growth_rate"].value,
        sliders["years"].value
    )
    source.data = dict(years=years, roth=roth, _401k=_401k)

# Attach sliders to callback function
for slider in sliders.values():
    slider.on_change('value', update)

# Initial calculation
update(None, None, None)

# Layout
layout = column(p, *sliders.values())
curdoc().add_root(layout)
curdoc().title = "401k vs Roth IRA Comparison"


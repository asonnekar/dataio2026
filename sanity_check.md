# Sanity Check Log

## 1. The "28 TWh" Anomaly (Building 1044)
- **Observation**: Notebook 5 reports Building 1044 has an EUI of 433,612.
- **Math Check**: 
  - 28 TWh/year * $0.08/kWh = $2.24 Billion/year.
  - **Verdict**: IMPOSSIBLE. This is a sensor error (likely cumulative reading reported as interval).
- **Action**: Must EXCLUDE this building from "Potential Savings" sums. Currently, our "Top 5" savings are dominated by this ghost number.

## 2. The "364 Days" Weather Data
- **Observation**: Weather file has 362 days (Notebook 4 output).
- **Verdict**: Acceptable (likely missing a few hours/days in raw feed), but means we aren't exactly 365.
- **Action**: Note in limitations.

## 3. "Cost of Inaction" (+5°F)
- **Observation**: +87.7 Million kWh increase.
- **Math Check**:
  - Total Campus Load (approx) ~400-500 GWh?
  - 87.7 M kWh is ~20% increase?
  - Wait, look at the baseline total in NB4 output: "Baseline total (Nov-Dec): 5,579.2 million kWh".
  - 5.5 BILLION kWh for 2 months?
  - 5.5 TWh for 2 months -> 33 TWh/year.
  - **Verdict**: The *Baseline* is also infected by the 28 TWh anomaly!
  - **CRITICAL**: The entire campus aggregate is biased by Building 1044. 
- **Action**: We need to remove Building 1044 and 0079 from the **Source Data** (Notebook 1 or 4) to get a realistic Campus Total. Otherwise, all "Campus Wide" stats are garbage.

## 4. Peak Alert Recall (92%)
- **Observation**: We got 12/13 peaks.
- **Verdict**: Statistically sound on the *test set*, but the *definition* of "Peak" is based on the infected total.
- **Action**: Removing the anomaly might change which days are "Peaks". 

## Correction Plan
1.  **Modify Notebook 4**: Filter out `simscode` [1044, 0079] immediately after loading data.
2.  **Re-run NB4 & NB5**.
3.  **Update Narrative**: Use the NEW, sane numbers (likely ~200-300 GWh total, not 30 TWh).

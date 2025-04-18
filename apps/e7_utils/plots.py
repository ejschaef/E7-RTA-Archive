import plotly.graph_objects as go
import plotly.offline as offline
from apps.e7_utils.battle_manager import BattleManager
from apps.e7_utils.user_manager import User
import numpy as np

def make_rank_plot(battles: BattleManager, user: User):
    battles_df = battles.to_dataframe()
    battles_df = battles_df.sort_values(by="time").reset_index(drop=True)
    
    x = list(battles_df.index.values)
    y = list(battles_df['scores_1'])

    fig = go.Figure()


    # Create the plot
    fig.add_trace(go.Scatter(
        x=x,
        y=y,
        mode='lines+markers',
        line=dict(color='#4f9293', width=2),
        customdata=np.stack((battles_df['time'].str[:10], battles_df['grades_1']), axis=-1),
        marker=dict(
            symbol='line-ns',
            size=6,
            color='#0df8fd',
            line=dict(width=0.75, color='#0df8fd')
        ),
        hovertemplate='Points: %{y}<br>' \
                      'Date: %{customdata[0]}<br>' \
                      'League: %{customdata[1]}<extra></extra>' # Custom hover text
    ))

    # Update layout for dark mode
    fig.update_layout(
        autosize=True,
        font_family="Open Sans",
        title=dict(
            text=f"{user.name}'s RTA Point Plot",
            font=dict(size=24, color='#dddddd'), # Adjust title color
            xanchor = 'center',
            yanchor = 'top',
            y = 0.95,  # Adjust vertical position if needed
            x = 0.5,
        ),
        xaxis=dict(
            title=dict(text='Battle Number (Chronological)', font=dict(size=18, color='#dddddd')), # Adjust x-axis title color
            showgrid=True,
            gridcolor='#8d8d8d', # Darker grid lines
            zeroline=False,
            tickfont=dict(size=12, color='#dddddd'), # Adjust tick color
        ),
        yaxis=dict(
            title=dict(text='Victory Points', font=dict(size=18, color='#dddddd')), # Adjust y-axis title color
            showgrid=True,
            gridcolor='#8d8d8d', # Darker grid lines
            zeroline=True,
            zerolinecolor='#dddddd',
            zerolinewidth=2,
            tickfont=dict(size=12, color='#dddddd'), # Adjust tick color
        ),
        # plot_bgcolor='#c704b0', # Dark background for the plot area
        # paper_bgcolor='#62a832', # Dark background for the entire figure

        plot_bgcolor='#1e222d', # Dark background for the plot area
        paper_bgcolor='#1e222d', # Dark background for the entire figure
    )


    # Convert the plot to HTML
    plot_html = offline.plot(fig, include_plotlyjs='cdn', output_type='div', config={'responsive': True})
    return plot_html

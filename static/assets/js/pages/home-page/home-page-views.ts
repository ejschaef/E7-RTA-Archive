import type { View } from "../orchestration/page-orchestration-template";
import { HeroInfoView } from "./page-views/home-page/hero-info/hero-info-logic";
import { LoadDataView } from "./page-views/home-page/load-data/load-data-logic";
import { StatsView } from "./page-views/home-page/stats/stats-logic";
import { SelectDataView } from "./page-views/home-page/select-data/select-data-logic";


export const HOME_PAGE_VIEWS: View[] = [
    HeroInfoView,
    LoadDataView,
    SelectDataView,
    StatsView,
]
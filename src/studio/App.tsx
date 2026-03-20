import React, { useState, useCallback, useEffect } from "react";
import type { Article } from "./services/newsService";
import { useNews } from "./hooks/useNews";
import { getOptimizedHeroImageUrl } from "./lib/hero-image-url";
import { Nav, type NavView } from "./components/Nav";
import { LoadingScreen } from "./components/LoadingScreen";
import { EmptyState } from "./components/EmptyState";
import { HeroCarousel } from "./components/HeroCarousel";
import { NewsGrid } from "./components/NewsGrid";
import { NewsListPage } from "./components/NewsListPage";
import { TeamsPage } from "./components/TeamsPage";
import { Footer } from "./components/Footer";
import { PostGenerator } from "./components/PostGenerator";
import { CarouselGenerator } from "./components/CarouselGenerator";
import { ProfilePage } from "./components/ProfilePage";
import { GamesPage } from "./components/GamesPage";
import { DataPage } from "./components/DataPage";
import type { EspnGame } from "./services/espnScoreboard";
import type { EspnStandings } from "./services/espnStandings";
import type { ScheduleWeek } from "./services/espnSchedule";
import { ALL_NFL_TEAMS } from "./lib/nfl-teams";
import type { EditorData } from "./types/editorData";
import { articleFromEditorData } from "./types/editorData";
import { HideLogoProvider } from "./context/HideLogoContext";

const HERO_PRELOAD_ID = "app-hero-first-preload";

/** Gera um artigo sintético a partir de um jogo ESPN para o PostGenerator (headline, imagem, time). */
function articleFromGame(game: EspnGame): Article {
  const homeAbbrev = game.home.team.abbreviation;
  const teamFromList = ALL_NFL_TEAMS.find((t) => t.initials === homeAbbrev);
  const headline = `${game.away.team.abbreviation} ${game.away.score} @ ${game.home.team.abbreviation} ${game.home.score}${game.status ? ` · ${game.status}` : ""}`;
  const description = `${game.away.team.displayName} ${game.away.score} x ${game.home.score} ${game.home.team.displayName}`;
  return {
    dataSourceIdentifier: `espn-game-${game.id}`,
    headline,
    description,
    published: game.date,
    categories: [],
    images: [
      { url: game.home.team.logo || "https://picsum.photos/seed/nfl/800/800" },
    ],
    team: teamFromList
      ? {
          name: teamFromList.name,
          abbreviation: teamFromList.initials,
          logo: teamFromList.logo,
          primaryColor: teamFromList.primary,
          secondaryColor: teamFromList.secondary,
          conference: null,
          division: null,
          city: null,
        }
      : undefined,
  };
}

function usePreloadFirstHeroImage(news: Article[]) {
  useEffect(() => {
    const firstUrl = news[0]?.images?.[0]?.url;
    if (!firstUrl) return;
    const url = getOptimizedHeroImageUrl(firstUrl);
    let link = document.getElementById(
      HERO_PRELOAD_ID,
    ) as HTMLLinkElement | null;
    if (link?.getAttribute("href") === url) return;
    link?.remove();
    link = document.createElement("link");
    link.id = HERO_PRELOAD_ID;
    link.rel = "preload";
    link.as = "image";
    link.href = url;
    document.head.appendChild(link);
    return () => document.getElementById(HERO_PRELOAD_ID)?.remove();
  }, [news]);
}

const FEATURED_COUNT = 5;

export default function App() {
  const { news, loading, hasNews } = useNews();
  usePreloadFirstHeroImage(news);
  const [view, setView] = useState<NavView>("home");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedGame, setSelectedGame] = useState<EspnGame | null>(null);
  const [selectedStandings, setSelectedStandings] =
    useState<EspnStandings | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleWeek | null>(
    null,
  );
  const [editorData, setEditorData] = useState<EditorData | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [articleForCarousel, setArticleForCarousel] = useState<Article | null>(
    null,
  );

  const featuredCount = Math.min(news.length, FEATURED_COUNT);
  const nextSlide = useCallback(() => {
    setCarouselIndex((prev) => (prev + 1) % featuredCount);
  }, [featuredCount]);
  const prevSlide = useCallback(() => {
    setCarouselIndex((prev) => (prev - 1 + featuredCount) % featuredCount);
  }, [featuredCount]);

  const openGenerator = useCallback((article: Article) => {
    setSelectedArticle(article);
    setSelectedGame(null);
    setShowGenerator(true);
  }, []);

  const openCarouselGenerator = useCallback((article: Article) => {
    setArticleForCarousel(article);
  }, []);

  const openGeneratorFromGame = useCallback((game: EspnGame) => {
    setSelectedGame(game);
    setSelectedArticle(null);
    setSelectedStandings(null);
    setSelectedSchedule(null);
    setEditorData(null);
    setShowGenerator(true);
  }, []);

  const openGeneratorFromStandings = useCallback((standings: EspnStandings) => {
    setSelectedStandings(standings);
    setSelectedArticle(null);
    setSelectedGame(null);
    setSelectedSchedule(null);
    setEditorData(null);
    setShowGenerator(true);
  }, []);

  const openGeneratorFromSchedule = useCallback((schedule: ScheduleWeek) => {
    setSelectedSchedule(schedule);
    setSelectedArticle(null);
    setSelectedGame(null);
    setSelectedStandings(null);
    setEditorData(null);
    setShowGenerator(true);
  }, []);

  const openGeneratorWithEditorData = useCallback((data: EditorData) => {
    setEditorData(data);
    setSelectedArticle(null);
    setSelectedGame(null);
    setSelectedStandings(null);
    setSelectedSchedule(null);
    setShowGenerator(true);
  }, []);

  const closeGenerator = useCallback(() => {
    setShowGenerator(false);
    setSelectedArticle(null);
    setSelectedGame(null);
    setSelectedStandings(null);
    setSelectedSchedule(null);
    setEditorData(null);
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <HideLogoProvider>
      <div className="min-h-screen bg-[#0a0a0a] text-white sports-grid font-sans selection:bg-nfl-red selection:text-white">
        <Nav currentView={view} onNavigate={setView} />
        <main className="space-y-16">
          {showGenerator &&
          (selectedArticle ||
            selectedGame ||
            selectedStandings ||
            selectedSchedule ||
            editorData) ? (
            <PostGenerator
              article={
                selectedArticle ??
                (editorData
                  ? articleFromEditorData(editorData)
                  : selectedGame
                    ? articleFromGame(selectedGame)
                    : selectedStandings
                      ? {
                          dataSourceIdentifier: `standings-${selectedStandings.season}`,
                          headline: `Tabela NFL ${selectedStandings.season}`,
                          description: "AFC e NFC",
                          published: "",
                          categories: [],
                          images: [],
                          team: undefined,
                        }
                      : {
                          dataSourceIdentifier: `schedule-${selectedSchedule!.season}-${selectedSchedule!.week}`,
                          headline: `Jogos – ${selectedSchedule!.season} ${selectedSchedule!.label}`,
                          description: `${selectedSchedule!.games.length} jogos`,
                          published: "",
                          categories: [],
                          images: [],
                          team: undefined,
                        })
              }
              onClose={closeGenerator}
              gameData={selectedGame ?? undefined}
              standingsData={selectedStandings ?? undefined}
              scheduleData={selectedSchedule ?? undefined}
              editorData={editorData ?? undefined}
            />
          ) : view === "profile" ? (
            <ProfilePage />
          ) : view === "teams" ? (
            <TeamsPage onCreatePostWithData={openGeneratorWithEditorData} />
          ) : view === "data" ? (
            <DataPage onCreatePostWithData={openGeneratorWithEditorData} />
          ) : view === "games" ? (
            <GamesPage
              onCreatePost={openGeneratorFromGame}
              onCreatePostWithStandings={openGeneratorFromStandings}
              onCreatePostWithSchedule={openGeneratorFromSchedule}
            />
          ) : view === "news" ? (
            hasNews ? (
              <NewsListPage
                articles={news}
                onGeneratePost={openGenerator}
                onGenerateCarousel={openCarouselGenerator}
              />
            ) : (
              <EmptyState />
            )
          ) : hasNews ? (
            <>
              <HeroCarousel
                articles={news}
                currentIndex={carouselIndex}
                onPrev={prevSlide}
                onNext={nextSlide}
                onGeneratePost={openGenerator}
                onGenerateCarousel={openCarouselGenerator}
              />
              <NewsGrid
                articles={news}
                onGeneratePost={openGenerator}
                onGenerateCarousel={openCarouselGenerator}
                onViewAll={() => setView("news")}
              />
              <Footer />
            </>
          ) : (
            <EmptyState />
          )}
        </main>
        {articleForCarousel && (
          <CarouselGenerator
            article={articleForCarousel}
            onClose={() => setArticleForCarousel(null)}
          />
        )}
      </div>
    </HideLogoProvider>
  );
}

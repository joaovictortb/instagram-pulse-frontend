"use client";

import { useQuery } from "@tanstack/react-query";
import {
  UserPlus,
  UserMinus,
  MapPin,
  PieChart as PieChartIcon,
  Activity,
  Globe,
  Languages,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatNumber } from "@/src/lib/utils";
import { apiFetch, readJsonBody } from "@/src/lib/api";

const COLORS = [
  "#E1306C",
  "#833AB4",
  "#F77737",
  "#FFDC80",
  "#405DE6",
  "#5851DB",
];

type AudienceMaps = {
  audience_city?: Record<string, number>;
  audience_country?: Record<string, number>;
  audience_gender_age?: Record<string, number>;
  audience_locale?: Record<string, number>;
};

/** Chaves Meta: `F.18-24`, `M.25-34` — só o primeiro `.` separa género da faixa etária. */
function splitGenderAgeKey(key: string): { genderRaw: string; age: string } {
  const i = key.indexOf(".");
  if (i <= 0) return { genderRaw: "U", age: key };
  return { genderRaw: key.slice(0, i), age: key.slice(i + 1) };
}

function normalizeGender(g: string): "F" | "M" | "U" {
  const u = g.trim().toUpperCase();
  if (u === "F" || u === "FEMALE" || u === "WOMAN" || u === "WOMEN") return "F";
  if (u === "M" || u === "MALE" || u === "MAN" || u === "MEN") return "M";
  return "U";
}

function entriesToSortedList(
  map: Record<string, number> | undefined,
  limit: number,
): { label: string; value: number }[] {
  if (!map || typeof map !== "object") return [];
  return Object.entries(map)
    .filter(([, v]) => Number.isFinite(Number(v)) && Number(v) > 0)
    .map(([label, value]) => ({ label, value: Number(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export default function AudiencePage() {
  const { data: account } = useQuery({
    queryKey: ["instagram-account"],
    queryFn: async () => readJsonBody(await apiFetch("/api/instagram/account")),
  });

  const {
    data: audience,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["instagram-audience"],
    queryFn: async () =>
      readJsonBody<AudienceMaps>(await apiFetch("/api/instagram/audience")),
  });

  const genderAgeMap = audience?.audience_gender_age;
  const cityMap = audience?.audience_city;
  const countryMap = audience?.audience_country;
  const localeMap = audience?.audience_locale;

  const genderAgeData =
    genderAgeMap && typeof genderAgeMap === "object"
      ? Object.entries(genderAgeMap).map(([key, value]) => {
          const { genderRaw, age } = splitGenderAgeKey(key);
          return {
            gender: normalizeGender(genderRaw),
            age,
            value: Number(value) || 0,
          };
        })
      : [];

  const ageGroups = genderAgeData.reduce<Record<string, number>>(
    (acc, curr) => {
      if (!curr.age) return acc;
      acc[curr.age] = (acc[curr.age] || 0) + curr.value;
      return acc;
    },
    {},
  );

  const pieData = Object.entries(ageGroups)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  const barData = [...pieData].sort((a, b) => {
    const parse = (s: string) => {
      const m = s.match(/^(\d+)/);
      return m ? Number(m[1]) : 0;
    };
    return parse(a.name) - parse(b.name);
  });

  const genderTotals = genderAgeData.reduce<Record<string, number>>(
    (acc, curr) => {
      acc[curr.gender] = (acc[curr.gender] || 0) + curr.value;
      return acc;
    },
    {},
  );

  const totalDemo = Object.values(genderTotals).reduce((a, b) => a + b, 0);
  const femalePercent =
    totalDemo > 0 ? Math.round(((genderTotals.F || 0) / totalDemo) * 100) : 0;
  const malePercent =
    totalDemo > 0 ? Math.round(((genderTotals.M || 0) / totalDemo) * 100) : 0;
  const unknownPercent =
    totalDemo > 0 ? Math.max(0, 100 - femalePercent - malePercent) : 0;

  const cityList = entriesToSortedList(cityMap, 8);
  const citySum = cityList.reduce((s, x) => s + x.value, 0);

  const topCities =
    citySum > 0
      ? cityList.map((item) => ({
          city: item.label,
          percentage: Math.round((item.value / citySum) * 100),
          value: item.value,
        }))
      : [];

  const countryList = entriesToSortedList(countryMap, 8);
  const countrySum = countryList.reduce((s, x) => s + x.value, 0);
  const topCountries =
    countrySum > 0
      ? countryList.map((item) => ({
          label: item.label,
          percentage: Math.round((item.value / countrySum) * 100),
          value: item.value,
        }))
      : [];

  const localeList = entriesToSortedList(localeMap, 10);
  const localeSum = localeList.reduce((s, x) => s + x.value, 0);
  const topLocales =
    localeSum > 0
      ? localeList.map((item) => ({
          label: item.label,
          percentage: Math.round((item.value / localeSum) * 100),
          value: item.value,
        }))
      : [];

  const hasAnyAudience =
    totalDemo > 0 || citySum > 0 || countrySum > 0 || localeSum > 0;

  if (isLoading) {
    return (
      <div className="p-8 text-center text-zinc-500 animate-pulse">
        Carregando insights de audiência…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-200 text-sm">
        Não foi possível carregar audiência:{" "}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Insights de Audiência</h2>
        <p className="text-zinc-500 text-sm mt-1">
          Dados da API Meta (insights lifetime). A Meta pode omitir demografia
          com poucos seguidores ou sem permissões de insights.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl">
            <UserPlus size={24} />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
              Seguidores totais
            </p>
            <h3 className="text-2xl font-bold">
              {formatNumber(account?.followers_count || 0)}
            </h3>
            <p className="text-[10px] text-emerald-500 font-bold mt-1">
              Conta Instagram
            </p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <UserMinus size={24} />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
              Seguindo
            </p>
            <h3 className="text-2xl font-bold">
              {formatNumber(account?.follows_count || 0)}
            </h3>
            <p className="text-[10px] text-zinc-500 font-bold mt-1">
              Contas que segues
            </p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
              Publicações
            </p>
            <h3 className="text-2xl font-bold">
              {formatNumber(account?.media_count || 0)}
            </h3>
            <p className="text-[10px] text-zinc-500 font-bold mt-1">
              Total de media na conta
            </p>
          </div>
        </div>
      </div>

      {!hasAnyAudience && (
        <div className="glass-card p-6 border border-amber-500/20 bg-amber-500/5 text-sm text-zinc-300">
          <p className="font-semibold text-amber-200 mb-2">
            A Meta não devolveu breakdown de audiência
          </p>
          <ul className="list-disc pl-5 space-y-1 text-zinc-400">
            <li>
              Confirma permissões do token (ex.:{" "}
              <code className="text-xs bg-zinc-800 px-1 rounded">
                instagram_manage_insights
              </code>
              ).
            </li>
            <li>
              Contas muito pequenas ou novas podem ter cidades/género vazios até
              haver dados agregados.
            </li>
            <li>
              Reinicia a API após alterar o backend — o endpoint agora junta
              todos os blocos em{" "}
              <code className="text-xs bg-zinc-800 px-1 rounded">values[]</code>
              .
            </li>
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-6">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <PieChartIcon size={18} className="text-brand-primary" />
            Demografia por idade
          </h3>
          <p className="text-xs text-zinc-500 mb-4">
            Distribuição por faixa etária (soma de F+M por idade).
          </p>

          {barData.length > 0 ? (
            <div className="h-[300px] w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={barData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#27272A"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#71717A"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis stroke="#71717A" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181B",
                      border: "1px solid #27272A",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#E1306C"
                    radius={[4, 4, 0, 0]}
                    name="Seguidores"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-zinc-500 text-sm border border-dashed border-zinc-700 rounded-xl">
              Sem dados de idade/género.
            </div>
          )}

          {pieData.length > 0 && (
            <div className="h-[220px] w-full min-h-[200px] mt-10 mb-10">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181B",
                      border: "1px solid #27272A",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="p-3 bg-zinc-900 rounded-xl border border-dashboard-border text-center">
              <p className="text-xs text-zinc-500 font-bold uppercase">
                Mulheres
              </p>
              <p className="text-xl font-bold">{femalePercent}%</p>
            </div>
            <div className="p-3 bg-zinc-900 rounded-xl border border-dashboard-border text-center">
              <p className="text-xs text-zinc-500 font-bold uppercase">
                Homens
              </p>
              <p className="text-xl font-bold">{malePercent}%</p>
            </div>
            <div className="p-3 bg-zinc-900 rounded-xl border border-dashboard-border text-center">
              <p className="text-xs text-zinc-500 font-bold uppercase">
                Outros
              </p>
              <p className="text-xl font-bold">{unknownPercent}%</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-bold mb-6 flex items-center gap-2">
            <MapPin size={18} className="text-brand-primary" />
            Principais cidades
          </h3>
          <div className="space-y-4">
            {topCities.length > 0 ? (
              topCities.map((item, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-sm gap-2">
                    <span className="font-medium truncate" title={item.city}>
                      {item.city}
                    </span>
                    <span className="text-zinc-500 shrink-0">
                      {item.percentage}% · {formatNumber(item.value)}
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-primary rounded-full transition-all"
                      style={{ width: `${Math.min(100, item.percentage)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-zinc-500 py-12">
                Sem dados de cidade neste relatório da Meta.
              </p>
            )}
          </div>
        </div>
      </div>

      {(topCountries.length > 0 || topLocales.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {topCountries.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Globe size={18} className="text-brand-primary" />
                Países
              </h3>
              <ul className="space-y-2 text-sm">
                {topCountries.map((row, i) => (
                  <li
                    key={i}
                    className="flex justify-between border-b border-dashboard-border/60 pb-2"
                  >
                    <span className="text-zinc-300 truncate pr-2">
                      {row.label}
                    </span>
                    <span className="text-zinc-500 shrink-0">
                      {row.percentage}% · {formatNumber(row.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {topLocales.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Languages size={18} className="text-brand-primary" />
                Idioma / locale
              </h3>
              <ul className="space-y-2 text-sm">
                {topLocales.map((row, i) => (
                  <li
                    key={i}
                    className="flex justify-between border-b border-dashboard-border/60 pb-2"
                  >
                    <span className="text-zinc-300 truncate pr-2 font-mono text-xs">
                      {row.label}
                    </span>
                    <span className="text-zinc-500 shrink-0">
                      {row.percentage}% · {formatNumber(row.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

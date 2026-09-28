"use client";

import Link from "next/link";
import { Clock, ExternalLink, Hash, MessagesSquare, Users, Volume2 } from "lucide-react";
import { GameBadge } from "@/components/common/badges";
import { UserAvatar } from "@/components/common/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminCommunity } from "../api";
import { useAdminDetailMessages } from "../detail-messages";
import type { AdminCommunityDetail } from "../detail-types";
import { formatDate, formatNumber } from "../format";
import { useAdminMessages } from "../messages";
import { AdminDetail } from "./admin-detail";
import { DetailHeader, KPI_GRID, ListCard, PersonLink } from "./detail-parts";
import { KpiCard } from "./finance-cards";

export function CommunityDetail({ id }: { id: string }) {
  const { t } = useAdminDetailMessages();
  return (
    <AdminDetail
      query={useAdminCommunity(id)}
      backHref="/admin/communities"
      backLabel={t("backToCommunities")}
      notFound={{ icon: MessagesSquare, title: t("communityNotFound") }}
    >
      {(data) => <CommunityDetailBody data={data} />}
    </AdminDetail>
  );
}

function CommunityDetailBody({ data }: { data: AdminCommunityDetail }) {
  const { t, language } = useAdminDetailMessages();
  const admin = useAdminMessages().t;
  const { community, channels, memberLimit } = data;
  const number = (value: number) => formatNumber(value, language);
  const messages = channels.reduce((sum, channel) => sum + channel.messageCount, 0);
  const lastActive = channels.reduce<string | null>((latest, channel) => (channel.lastMessageAt && (!latest || channel.lastMessageAt > latest) ? channel.lastMessageAt : latest), null);
  const textCount = channels.filter((channel) => channel.kind === "TEXT").length;

  return (
    <>
      <DetailHeader
        avatar={<UserAvatar name={community.name} imageKey={community.iconKey} kind="team" className="size-16 text-xl" />}
        title={community.name}
        badges={community.game ? <GameBadge game={community.game} /> : <Badge variant="outline">{t("anyGame")}</Badge>}
        lines={[
          <>
            {t("owner")}: <PersonLink person={community.owner} />
          </>,
          `${admin("colCreated")} ${formatDate(community.createdAt, language)}`,
        ]}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/communities/${community.id}`}>
              <ExternalLink /> {t("openPublicPage")}
            </Link>
          </Button>
        }
      />

      <div className={KPI_GRID}>
        <KpiCard icon={Users} label={t("communityMembers")} value={number(community.memberCount)} hints={[]} />
        <KpiCard icon={MessagesSquare} label={t("communityMessages")} value={number(messages)} hints={[]} />
        <KpiCard icon={Hash} label={t("communityChannels")} value={number(channels.length)} hints={[t("communityChannelsHint", { text: textCount, voice: channels.length - textCount })]} />
        <KpiCard icon={Clock} label={t("communityLastActive")} value={lastActive ? formatDate(lastActive, language) : t("none")} hints={[]} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ListCard title={t("communityAbout")} empty={t("none")} emptyIcon={MessagesSquare} isEmpty={!community.description}>
          <p className="text-sm whitespace-pre-line">{community.description}</p>
        </ListCard>

        <ListCard title={t("communityChannels")} empty={t("none")} emptyIcon={Hash} isEmpty={channels.length === 0}>
          <ul className="flex flex-col gap-2">
            {channels.map((channel) => {
              const Icon = channel.kind === "TEXT" ? Hash : Volume2;
              return (
                <li key={channel.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                  <span className="font-medium">{channel.name}</span>
                  <Badge variant="outline">{t(channel.kind === "TEXT" ? "channelText" : "channelVoice")}</Badge>
                  {channel.kind === "TEXT" && (
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                      {channel.lastMessageAt
                        ? `${t("channelMessages", { count: number(channel.messageCount) })} · ${t("channelLast", { date: formatDate(channel.lastMessageAt, language) })}`
                        : t("noActivity")}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </ListCard>
      </div>

      <ListCard
        title={t("communityMembers")}
        empty={t("none")}
        emptyIcon={Users}
        isEmpty={community.members.length === 0}
        note={community.memberCount > memberLimit ? t("latestOnly", { count: memberLimit }) : null}
      >
        <ul className="grid gap-2 sm:grid-cols-2">
          {community.members.map((member) => (
            <li key={member.user.id} className="flex flex-wrap items-center gap-2 text-sm">
              <PersonLink person={member.user} />
              {member.role === "owner" && <Badge variant="outline">{t("owner")}</Badge>}
              {member.user.status !== "ACTIVE" && <Badge variant="outline">{admin(`status_${member.user.status}`)}</Badge>}
              <span className="ml-auto text-xs text-muted-foreground">{t("joinedCommunity", { date: formatDate(member.createdAt, language) })}</span>
            </li>
          ))}
        </ul>
      </ListCard>
    </>
  );
}

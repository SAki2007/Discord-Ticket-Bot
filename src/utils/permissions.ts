import {
  PermissionFlagsBits,
  type Guild,
  type GuildMember,
  type OverwriteResolvable,
} from "discord.js";

export function buildTicketPermissionOverwrites(input: {
  guild: Guild;
  creatorUserId: string;
  staffRoleId: string;
  botUserId: string;
}): OverwriteResolvable[] {
  return [
    {
      id: input.guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: input.creatorUserId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
    {
      id: input.staffRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageChannels,
      ],
    },
    {
      id: input.botUserId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageChannels,
      ],
    },
  ];
}

export function hasStaffRole(member: GuildMember, staffRoleId: string): boolean {
  return member.roles.cache.has(staffRoleId);
}

function compareBySortOrderThenName(left, right) {
  const leftOrder =
    Number.isFinite(Number(left?.sortOrder)) ? Number(left.sortOrder) : Number.MAX_SAFE_INTEGER
  const rightOrder =
    Number.isFinite(Number(right?.sortOrder)) ? Number(right.sortOrder) : Number.MAX_SAFE_INTEGER

  if (leftOrder !== rightOrder) return leftOrder - rightOrder
  return `${left?.name || ''}`.localeCompare(`${right?.name || ''}`, 'ko')
}

function compareUsersByPositionThenName(left, right, positionSortOrderMap) {
  const leftOrder = positionSortOrderMap.get(left?.positionId) ?? Number.MAX_SAFE_INTEGER
  const rightOrder = positionSortOrderMap.get(right?.positionId) ?? Number.MAX_SAFE_INTEGER

  if (leftOrder !== rightOrder) return leftOrder - rightOrder
  return `${left?.name || ''}`.localeCompare(`${right?.name || ''}`, 'ko')
}

function createNodeKey(type, id) {
  return `${type}:${id}`
}

function normalizeDisplayValue(value, fallback = '-') {
  const normalized = `${value || ''}`.trim()
  return normalized || fallback
}

export function buildOrganizationFullChart({
  affiliateName = '',
  departments = [],
  teams = [],
  users = [],
  positions = [],
} = {}) {
  const positionSortOrderMap = new Map(
    positions.map((position) => [
      position.positionId,
      Number.isFinite(Number(position?.sortOrder)) ? Number(position.sortOrder) : Number.MAX_SAFE_INTEGER,
    ]),
  )

  const sortedDepartments = [...departments].sort(compareBySortOrderThenName)
  const activeTeams = teams.filter((team) => `${team?.status || ''}`.toUpperCase() === 'ACTIVE')
  const teamsByDepartmentId = new Map()
  const usersByDepartmentId = new Map()
  const nodeMap = new Map()

  for (const team of activeTeams) {
    const current = teamsByDepartmentId.get(team.departmentId) || []
    current.push(team)
    teamsByDepartmentId.set(team.departmentId, current)
  }

  for (const currentTeams of teamsByDepartmentId.values()) {
    currentTeams.sort(compareBySortOrderThenName)
  }

  for (const user of users) {
    if (!user?.departmentId) continue
    const current = usersByDepartmentId.get(user.departmentId) || []
    current.push(user)
    usersByDepartmentId.set(user.departmentId, current)
  }

  for (const currentUsers of usersByDepartmentId.values()) {
    currentUsers.sort((left, right) => compareUsersByPositionThenName(left, right, positionSortOrderMap))
  }

  const departmentNodes = sortedDepartments.map((department) => {
    const departmentKey = createNodeKey('department', department.departmentId)
    const departmentTeams = teamsByDepartmentId.get(department.departmentId) || []
    const departmentUsers = usersByDepartmentId.get(department.departmentId) || []
    const teamUserMap = new Map(departmentTeams.map((team) => [team.teamId, []]))
    const unassignedUsers = []

    for (const user of departmentUsers) {
      if (user.teamId && teamUserMap.has(user.teamId)) {
        teamUserMap.get(user.teamId).push(user)
      } else {
        unassignedUsers.push(user)
      }
    }

    const teamNodes = departmentTeams.map((team) => {
      const teamKey = createNodeKey('team', team.teamId)
      const teamUsers = teamUserMap.get(team.teamId) || []
      const memberNodes = teamUsers.map((user) => {
        const memberKey = createNodeKey('member', user.userId)
        const memberNode = {
          key: memberKey,
          type: 'member',
          id: user.userId,
          name: normalizeDisplayValue(user.name),
          email: normalizeDisplayValue(user.email, ''),
          position: normalizeDisplayValue(user.position),
          departmentName: normalizeDisplayValue(department.name),
          teamName: normalizeDisplayValue(team.name),
          memberCount: 1,
        }

        nodeMap.set(memberKey, memberNode)
        return memberNode
      })

      const teamNode = {
        key: teamKey,
        type: 'team',
        id: team.teamId,
        name: normalizeDisplayValue(team.name),
        departmentName: normalizeDisplayValue(department.name),
        memberCount: memberNodes.length,
        members: memberNodes,
        isVirtual: false,
      }

      nodeMap.set(teamKey, teamNode)
      return teamNode
    })

    if (unassignedUsers.length > 0) {
      const virtualTeamKey = createNodeKey('team', `unassigned-${department.departmentId}`)
      const memberNodes = unassignedUsers.map((user) => {
        const memberKey = createNodeKey('member', user.userId)
        const memberNode = {
          key: memberKey,
          type: 'member',
          id: user.userId,
          name: normalizeDisplayValue(user.name),
          email: normalizeDisplayValue(user.email, ''),
          position: normalizeDisplayValue(user.position),
          departmentName: normalizeDisplayValue(department.name),
          teamName: '미지정 팀',
          memberCount: 1,
        }

        nodeMap.set(memberKey, memberNode)
        return memberNode
      })

      const virtualTeamNode = {
        key: virtualTeamKey,
        type: 'team',
        id: `unassigned-${department.departmentId}`,
        name: '미지정 팀',
        departmentName: normalizeDisplayValue(department.name),
        memberCount: memberNodes.length,
        members: memberNodes,
        isVirtual: true,
      }

      nodeMap.set(virtualTeamKey, virtualTeamNode)
      teamNodes.push(virtualTeamNode)
    }

    const departmentNode = {
      key: departmentKey,
      type: 'department',
      id: department.departmentId,
      name: normalizeDisplayValue(department.name),
      memberCount: departmentUsers.length,
      teams: teamNodes,
      teamCount: teamNodes.length,
      members: departmentUsers.map((user) => ({
        userId: user.userId,
        name: normalizeDisplayValue(user.name),
        position: normalizeDisplayValue(user.position),
      })),
    }

    nodeMap.set(departmentKey, departmentNode)
    return departmentNode
  })

  const totalTeamCount = departmentNodes.reduce((sum, department) => sum + department.teams.length, 0)
  const totalMemberCount = departmentNodes.reduce((sum, department) => sum + department.memberCount, 0)
  const rootNode = {
    key: createNodeKey('root', affiliateName || 'organization'),
    type: 'root',
    id: affiliateName || 'organization',
    name: normalizeDisplayValue(affiliateName, '전체 조직'),
    departmentCount: departmentNodes.length,
    teamCount: totalTeamCount,
    memberCount: totalMemberCount,
    departments: departmentNodes,
  }

  nodeMap.set(rootNode.key, rootNode)

  return {
    rootNode,
    nodeMap,
    defaultSelectedKey: departmentNodes[0]?.key || rootNode.key,
    isEmpty: departmentNodes.length === 0,
  }
}

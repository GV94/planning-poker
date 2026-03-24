import type { LobbyId } from 'shared-types';
import { handleExists } from './exists.js';

vi.mock('../LobbyService.js', () => ({
  loadLobby: vi.fn(),
}));

import { loadLobby } from '../LobbyService.js';

const mockLoadLobby = loadLobby as ReturnType<typeof vi.fn>;

describe('handleExists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('acks ok:true when lobby exists', async () => {
    mockLoadLobby.mockResolvedValue({ id: 'lobby-1' });
    const ack = vi.fn();

    await handleExists({ lobbyId: 'lobby-1' as LobbyId }, ack);

    expect(mockLoadLobby).toHaveBeenCalledWith('lobby-1');
    expect(ack).toHaveBeenCalledWith({ ok: true });
  });

  it('acks ok:false when lobby does not exist', async () => {
    mockLoadLobby.mockResolvedValue(null);
    const ack = vi.fn();

    await handleExists({ lobbyId: 'nonexistent' as LobbyId }, ack);

    expect(ack).toHaveBeenCalledWith({ ok: false });
  });

  it('acks ok:false when lobbyId is missing', async () => {
    const ack = vi.fn();

    await handleExists({}, ack);

    expect(mockLoadLobby).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith({ ok: false });
  });

  it('returns early without error when no ack callback is provided', async () => {
    await expect(
      handleExists({ lobbyId: 'lobby-1' as LobbyId })
    ).resolves.toBeUndefined();

    expect(mockLoadLobby).not.toHaveBeenCalled();
  });
});

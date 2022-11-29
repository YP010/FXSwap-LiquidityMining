## Liquidity Mining

FX Swap Liquidity Mining: https://fx-swap.io/#/farm

### RewarderViaMultiplier Contract
1. Users can earn WFX and other reward tokens simultaneously.
2. Each reward token is a `X` multipier of the WFX.
    - E.g. If token A multiplier is set as 20, for every 1 WFX reward, user also earns 20 token A.
3. The reward will end if:
    - Multiplier is set as 0 or 
    - Balance of the reward token in RewarderViaMultiplier contract is 0
4. Users will only receive the balance of the reward token if there's insufficient balance in the RewarderViaMuliplier Contract.
5. Whenever users deposit, withdraw or harvest, the WFX and other reward tokens will automatically be claimed.
6. Reward provider could contact the contract owner to add reward token for that specific LP pair.
7. Only the MasterChefV2 contract could write RewarderViaMultiplier contract `onReward` function.
8. Users could read `pendingTokens` function to check how much reward tokens they can earn based on the WFX reward amount.
9. Reward Multiplier: Multiplier Value x 10 ** Reward Token Decimal
    - E.g. Multiplier Value = 20 and Reward Token Decimal = 6
    - Reward Multiplier = 20 x 10 ** 6 = 20,000,000

### Contracts Deployed to f(x)evm Testnet
- MasterChef deployed to : 0x8427f3573ba5691Cb442DaB111770DCd78ED3acF
- MasterChefV2 deployed to : [0x8427f3573ba5691Cb442DaB111770DCd78ED3acF](https://testnet-explorer.functionx.io/evm/address/0x8427f3573ba5691Cb442DaB111770DCd78ED3acF)
- RewardToken deployed to : [0xf65eAe2Bef3A32C0C79aba643f97CCab22bD2b53](https://testnet-explorer.functionx.io/evm/address/0xf65eAe2Bef3A32C0C79aba643f97CCab22bD2b53)
- RewardTokenExtra deployed to : [0xF704DB1f036B60De57C610C5F0370aE8747E54A9](https://testnet-explorer.functionx.io/evm/address/0xF704DB1f036B60De57C610C5F0370aE8747E54A9)
- RewarderViaMultiplier deployed to : [0x2faa0230b3a51D5B5b1e31cA18AD8a4A61b18872](https://testnet-explorer.functionx.io/evm/address/0x2faa0230b3a51D5B5b1e31cA18AD8a4A61b18872)
